from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch, os
from prometheus_client import Summary, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

app = FastAPI(title="Model Server")

# Force CPU usage
device = torch.device("cpu")
if os.cpu_count():
    torch.set_num_threads(os.cpu_count())

MODEL_REPO = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

# Load TinyLlama at startup
tokenizer = AutoTokenizer.from_pretrained(MODEL_REPO, padding_side="left")
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
model = AutoModelForCausalLM.from_pretrained(
    MODEL_REPO,
    dtype=torch.float32
).to(device)
model.eval()

@app.get("/info")
def info():
    return {
        "active_model": MODEL_REPO,
        "device": str(device),
        "torch_num_threads": torch.get_num_threads(),
        "dtype": str(next(model.parameters()).dtype)
    }

class GenerationRequest(BaseModel):
    prompt: list[str]
    max_new_tokens: int = 4092
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
    if not request.prompt:
        raise HTTPException(status_code=400, detail="prompt must be a non-empty list")
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
