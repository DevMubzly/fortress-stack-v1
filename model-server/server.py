from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch, os, platform
from prometheus_client import Summary, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response, Request

app = FastAPI(title="Model Server")

# Force CPU usage
device = torch.device("cpu")
# Optional: control CPU threads (or set via env: OMP_NUM_THREADS / MKL_NUM_THREADS)
if os.cpu_count():
    torch.set_num_threads(os.cpu_count())

# Use a cross-platform model base directory
if platform.system() == "Windows":
    MODEL_BASE_DIR = os.path.join("c:", "Users", "User", "Desktop", "Projects", "fortress-stack", "fastapi", "models")
else:
    MODEL_BASE_DIR = os.path.expanduser("~/fortress-stack/fastapi/models")

FALLBACK_MODEL_REPO = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

model = None
tokenizer = None
active_model_path = None

def load_fallback_model():
    global model, tokenizer, active_model_path
    try:
        tokenizer = AutoTokenizer.from_pretrained(FALLBACK_MODEL_REPO, padding_side="left")
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        model = AutoModelForCausalLM.from_pretrained(
            FALLBACK_MODEL_REPO,
            dtype=torch.float32  # <-- use dtype instead of torch_dtype
        ).to(device)
        model.eval()
        active_model_path = FALLBACK_MODEL_REPO
        return True
    except Exception as e:
        print(f"Failed to load fallback model: {e}")
        return False

def load_model_from_dir(model_name: str):
    """
    Loads a model from the local MODEL_BASE_DIR directory.
    Expects model_name to match a subdirectory containing the model files.
    """
    global model, tokenizer, active_model_path
    model_path = os.path.join(MODEL_BASE_DIR, model_name)
    if not os.path.isdir(model_path):
        print(f"Model directory not found: {model_path}")
        return False
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path, padding_side="left")
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        model = AutoModelForCausalLM.from_pretrained(model_path, dtype=torch.float32).to(device)
        model.eval()
        active_model_path = model_path
        print(f"Loaded model from {model_path}")
        return True
    except Exception as e:
        print(f"Failed to load model from {model_path}: {e}")
        return False

def get_model_state(request: Request):
    # Attach model state to the app instance for thread/process safety
    if not hasattr(request.app.state, "model"):
        request.app.state.model = None
        request.app.state.tokenizer = None
        request.app.state.active_model_path = None
    return request.app.state

@app.get("/info")
def info(request: Request):
    state = get_model_state(request)
    if state.model is None:
        loaded = load_fallback_model()
        if not loaded:
            return {"active_model": None, "error": "No model loaded and fallback not present"}
        state.model = model
        state.tokenizer = tokenizer
        state.active_model_path = active_model_path
    return {
        "active_model": state.active_model_path,
        "device": str(device),
        "torch_num_threads": torch.get_num_threads(),
        "dtype": str(next(state.model.parameters()).dtype),
        "fallback": state.active_model_path == FALLBACK_MODEL_REPO
    }

class GenerationRequest(BaseModel):
    prompt: list[str]
    max_new_tokens: int = 4092  # <-- set default max tokens to 4092
    temperature: float = 0.8
    top_p: float = 0.95

GEN_TIME = Summary("model_generate_latency_seconds", "Time spent generating")

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/generate")
@GEN_TIME.time()
def generate_text(request: GenerationRequest):
    global model, tokenizer
    if model is None or tokenizer is None:
        loaded = load_fallback_model()
        if not loaded:
            raise HTTPException(status_code=409, detail="No model loaded and fallback not present")
    if not request.prompt:
        raise HTTPException(status_code=400, detail="prompt must be a non-empty list")
    # Improved temperature validation: must be > 0 and < 2.0
    if request.temperature is None or request.temperature <= 0 or request.temperature > 2.0:
        raise HTTPException(status_code=400, detail="temperature must be > 0 and <= 2.0")
    inputs = tokenizer(
        request.prompt,
        return_tensors="pt",
        padding=True,
        truncation=True,
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.inference_mode():
        output = model.generate(
            **inputs,
            max_new_tokens=request.max_new_tokens,
            do_sample=True,
            temperature=request.temperature,
            top_p=request.top_p,
            pad_token_id=tokenizer.eos_token_id,
        )
    results = []
    for i in range(len(request.prompt)):
        text = tokenizer.decode(output[i], skip_special_tokens=True)
        results.append(text)
    # Always return both fields for consistency
    return {
        "generated_text": results[0] if len(results) == 1 else None,
        "generated_texts": results,
        "usage": {
            "prompt_count": len(request.prompt),
            "max_new_tokens": request.max_new_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p
        }
    }

@app.post("/load")
def load_model(request: dict):
    """
    Loads a model by name from MODEL_BASE_DIR.
    Example request: { "model_name": "TinyLlama__TinyLlama-1.1B-Chat-v1.0" }
    """
    model_name = request.get("model_name")
    if not model_name:
        raise HTTPException(status_code=400, detail="model_name is required")
    loaded = load_model_from_dir(model_name)
    if not loaded:
        # Try to load fallback model if requested model fails
        fallback_loaded = load_fallback_model()
        if not fallback_loaded:
            raise HTTPException(
                status_code=500,
                detail=f"Model '{model_name}' not found or failed to load, and fallback model also failed to load"
            )
        return {
            "active_model": FALLBACK_MODEL_REPO,
            "error": f"Model '{model_name}' not found or failed to load. Fallback model loaded instead."
        }
    return {"active_model": active_model_path}
