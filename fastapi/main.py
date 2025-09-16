import os
import uuid
import time
import sqlalchemy as sa
from fastapi import FastAPI, Header, HTTPException, Depends, Response, Cookie, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
import httpx
from sqlalchemy.orm import sessionmaker, declarative_base
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, date
from sqlalchemy import UniqueConstraint
from dotenv import load_dotenv
import psutil
from sqlalchemy.engine import Engine
from pathlib import Path
import json
from huggingface_hub import snapshot_download
import threading

load_dotenv()
#configurations
DB_URL = os.getenv("DB_URL", "sqlite:///./fortress-stack.db")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL", "http://localhost:8000/generate")  # default to model server port
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# fail fast if secret is not provided
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")

#database setup 
engine = sa.create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    name = sa.Column(sa.String, unique=True, index=True, nullable=False)
    created_at = sa.Column(sa.DateTime, default=sa.func.now())

class User(Base):
    __tablename__ = "users"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    company_id = sa.Column(sa.Integer, sa.ForeignKey("companies.id"), nullable=False)
    username = sa.Column(sa.String, nullable=False)
    hashed_password = sa.Column(sa.String, nullable=False)
    created_at = sa.Column(sa.DateTime, default=sa.func.now())
    __table_args__ = (UniqueConstraint("company_id", "username", name="uq_user_company_username"),)

class Project(Base):
    __tablename__ = "projects"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    company_id = sa.Column(sa.Integer, sa.ForeignKey("companies.id"), nullable=False)
    name = sa.Column(sa.String, index=True)
    description = sa.Column(sa.String, nullable=True)
    department = sa.Column(sa.String, nullable=True)
    status = sa.Column(sa.String, default="active")  # NEW: used by /admin/stats/projects/status
    created_at = sa.Column(sa.DateTime, server_default=sa.func.now())
    __table_args__ = (sa.UniqueConstraint("company_id", "name", name="uq_project_company_name"),)

class APIKey(Base):
    __tablename__ = "api_keys"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    project_id = sa.Column(sa.Integer, sa.ForeignKey("projects.id"))
    key = sa.Column(sa.String, unique=True, index=True)
    name = sa.Column(sa.String)
    revoked = sa.Column(sa.Boolean, default=False)
    created_at = sa.Column(sa.DateTime, default=sa.func.now())
    __table_args__ = (
        sa.UniqueConstraint("project_id", "name", name="uq_apikey_project_name"),
        sa.Index("ix_apikey_project_revoked", "project_id", "revoked"),  # speed up counts
    )

class APIKeyStats(Base):
    __tablename__ = "api_key_stats"
    api_key_id = sa.Column(sa.Integer, sa.ForeignKey("api_keys.id"), primary_key=True)
    request_count = sa.Column(sa.Integer, default=0, nullable=False)
    last_used_at = sa.Column(sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())

class Usage(Base):
    __tablename__ = "usage"
    id = sa.Column(sa.Integer, primary_key=True, index=True)
    api_key_id = sa.Column(sa.Integer, sa.ForeignKey("api_keys.id"))
    prompt_tokens = sa.Column(sa.Integer)
    completion_tokens = sa.Column(sa.Integer)
    total_tokens = sa.Column(sa.Integer)
    used_at = sa.Column(sa.DateTime, default=sa.func.now())
    latency_ms = sa.Column(sa.Integer)  # NEW
    __table_args__ = (
        sa.Index("ix_usage_api_key_used_at", "api_key_id", "used_at"),
    )

Base.metadata.create_all(bind=engine)

def ensure_schema(engine: Engine):
    with engine.connect() as conn:
        # Add projects.status if missing (SQLite)
        cols = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(projects)")).fetchall()]
        if "status" not in cols:
            conn.execute(sa.text("ALTER TABLE projects ADD COLUMN status VARCHAR DEFAULT 'active'"))
        # Ensure helpful indexes exist
        conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_usage_api_key_used_at ON usage (api_key_id, used_at)"))
        conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_apikey_project_revoked ON api_keys (project_id, revoked)"))

ensure_schema(engine)

#app setup 
app = FastAPI(title="Fortress-stack API")

# Prometheus metrics (keep labels low-cardinality)
HTTP_REQS = Counter("fs_http_requests_total", "HTTP requests", ["route", "code"])
GEN_LAT = Histogram("fs_generate_latency_seconds", "Latency of /generate")

#CORS middleware 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally: 
        db.close()

#prometheus metrics
REQS = Counter("fs_requests_total", "Total requests", ["api_key"])
PROMPT_TOKENS = Counter("fs_prompt_tokens_total", "Prompt tokens used", ["api_key"])
COMPLETION_TOKENS = Counter("fs_completion_tokens_total", "Completion tokens used", ["api_key"])
TOTAL_TOKENS = Counter("fs_total_tokens_total", "Total tokens used", ["api_key"])
LAT = Histogram("fs_request_latency_seconds", "Request latency")

#pydantic models
class GenerationRequest(BaseModel):
    prompt: list[str]
    max_new_tokens: int = 4092
    temperature: float = 0.8
    top_p: float = 0.95

class APIKeyCreate(BaseModel):
    project_id: int
    name: str

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    department: str | None = None

class SignUpRequest(BaseModel):
    company: str
    username: str
    password: str

class LoginRequest(BaseModel):
    company: str
    username: str
    password: str

class APIKeyRevoke(BaseModel):
    api_key: str

class AdminCreateUserRequest(BaseModel):
    username: str
    password: str

class DownloadRequest(BaseModel):
    repo_id: str

#auth helpers
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_or_create_company(db: Session, name: str) -> Company:
    comp = db.query(Company).filter(Company.name == name).first()
    if comp:
        return comp
    comp = Company(name=name)
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def get_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None

def get_auth_context(
    authorization: str = Header(None),
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    token = get_bearer_token(authorization) or access_token
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    company_id = payload.get("company_id")
    if not user_id or company_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.company_id != int(company_id):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"user": user, "company_id": int(company_id)}

# NEW: utility to get or create a default API key for a project
def get_or_create_api_key(db, project_id: int, name: str = "default"):
    key_obj = (
        db.query(APIKey)
        .filter(APIKey.project_id == project_id, APIKey.revoked == False)
        .first()
    )
    if key_obj:
        return key_obj.key
    new_key = str(uuid.uuid4())
    api_key = APIKey(project_id=project_id, name=name, key=new_key)
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key.key

APP_START_TIME = time.time()

#admin endpoints
@app.post("/auth/signup")
def auth_signup(payload: SignUpRequest, response: Response, db: Session = Depends(get_db)):
    company = get_or_create_company(db, payload.company)
    if db.query(User).filter(User.company_id == company.id, User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists for this company")

    user = User(
        company_id=company.id,
        username=payload.username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "username": user.username, "company_id": company.id})
    # HttpOnly cookie (secure=False for localhost; set True in prod)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return {
        "company": {"id": company.id, "name": company.name},
        "user": {"id": user.id, "username": user.username},
    }

@app.post("/auth/login")
def auth_login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.name == payload.company).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    user = db.query(User).filter(User.company_id == company.id, User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "username": user.username, "company_id": company.id})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return {
        "company": {"id": company.id, "name": company.name},
        "user": {"id": user.id, "username": user.username},
    }

@app.post("/auth/logout")
def auth_logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@app.get("/auth/verify")
def auth_verify(ctx = Depends(get_auth_context)):
    user = ctx["user"]
    return {
        "valid": True,
        "user": {"id": user.id, "username": user.username},
        "company_id": ctx["company_id"],
    }

@app.post("/admin/project")
def create_project(
    data: ProjectCreate,
    ctx=Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    # Ensure unique project name within company
    if (
        db.query(Project)
        .filter(Project.company_id == ctx["company_id"], Project.name == data.name)
        .first()
    ):
        raise HTTPException(status_code=409, detail="Project name already exists")
    project = Project(
        company_id=ctx["company_id"],
        name=data.name,
        description=data.description,
        department=data.department,  # <— save it
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "department": project.department,
        "created_at": project.created_at,
    }

@app.delete("/admin/project/{project_id}")
def delete_project(
    project_id: int,
    ctx=Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.company_id != ctx["company_id"]:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete associated API keys and usage records
    db.query(Usage).filter(Usage.api_key_id.in_(
        db.query(APIKey.id).filter(APIKey.project_id == project.id)
    )).delete(synchronize_session=False)
    
    db.query(APIKey).filter(APIKey.project_id == project.id).delete(synchronize_session=False)
    
    # Delete the project itself
    db.delete(project)
    db.commit()
    
    return {"status": "deleted", "project_id": project_id}

# List all projects for this company
@app.get("/admin/projects")
def list_projects(
    ctx=Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    key_count_subq = (
        sa.select(sa.func.count(APIKey.id))
        .where(APIKey.project_id == Project.id)
        .correlate(Project)
        .scalar_subquery()
    )
    rows = (
        db.query(
            Project.id,
            Project.name,
            Project.description,
            Project.created_at,
            Project.company_id,
            getattr(Project, "department", None).label("department"),
            key_count_subq.label("key_count"),
        )
        .filter(Project.company_id == ctx["company_id"])
        .order_by(Project.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "department": r.department,
            "created_at": r.created_at,
            "key_count": r.key_count,
        }
        for r in rows
    ]

# Create API key manually for a project (many keys per project)
@app.post("/admin/apikey")
def create_api_key(
    data: APIKeyCreate,
    ctx=Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project or project.company_id != ctx["company_id"]:
        raise HTTPException(status_code=404, detail="Project not found")

    # prevent duplicate key names within the same project
    exists = db.query(APIKey).filter(APIKey.project_id == project.id, APIKey.name == data.name, APIKey.revoked == False).first()
    if exists:
        raise HTTPException(status_code=409, detail="API key name already exists for this project")

    key = str(uuid.uuid4())
    api_key = APIKey(project_id=project.id, name=data.name, key=key)
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return {
        "api_key": api_key.key,  # only return at creation time
        "name": api_key.name,
        "project_id": api_key.project_id,
        "revoked": api_key.revoked,
        "created_at": api_key.created_at,
        "id": api_key.id,
    }

# List API keys for a project
@app.get("/admin/apikeys")
def list_api_keys(
    project_id: int,
    ctx=Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.company_id != ctx["company_id"]:
        raise HTTPException(status_code=404, detail="Project not found")
    keys = db.query(APIKey).filter(APIKey.project_id == project_id).order_by(APIKey.created_at.desc()).all()
    return [
        {
            # do not return raw keys here
            "id": k.id,
            "name": k.name,
            "revoked": k.revoked,
            "created_at": k.created_at,
            "prefix": (k.key or "")[:5],  # new: first 5 chars for display
        }
        for k in keys
    ]

@app.post("/admin/apikey/{key_id}/revoke")
def revoke_api_key(
    key_id: int,
    ctx=Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    key = (
        db.query(APIKey)
        .join(Project, APIKey.project_id == Project.id)
        .filter(APIKey.id == key_id, Project.company_id == ctx["company_id"])
        .first()
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    if key.revoked:
        return {"id": key.id, "revoked": True}
    key.revoked = True
    db.commit()
    return {"id": key.id, "revoked": True}

@app.post("/admin/apikey/{key_id}/restore")
def restore_api_key(
    key_id: int,
    ctx=Depends(get_auth_context),
    db: Session = Depends(get_db),
):
    key = (
        db.query(APIKey)
        .join(Project, APIKey.project_id == Project.id)
        .filter(APIKey.id == key_id, Project.company_id == ctx["company_id"])
        .first()
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    if not key.revoked:
        return {"id": key.id, "revoked": False}
    key.revoked = False
    db.commit()
    return {"id": key.id, "revoked": False}

#main endpoint for generation
@app.post("/generate")
async def generate(request: GenerationRequest, x_api_key: str = Header(None), db: Session = Depends(get_db)):
    start = time.time()
    if not x_api_key: 
        raise HTTPException(status_code=400, detail="API key missing")
    key = db.query(APIKey).filter(APIKey.key == x_api_key, APIKey.revoked == False).first()
    if not key:
        raise HTTPException(status_code=403, detail="Invalid or revoked API key")

    # project/company for metadata
    project = db.query(Project).filter(Project.id == key.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    labels_id = str(key.id)
    REQS.labels(api_key=labels_id).inc()
    start_time = time.time()

    meta_headers = {
        "x-company-id": str(project.company_id),
        "x-project-id": str(project.id),
        "x-api-key-id": str(key.id),
    }

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:  # <-- Set timeout to 3 minutes (180 seconds)
            resp = await client.post(MODEL_SERVER_URL, json=request.dict(), headers=meta_headers)
        LAT.observe(time.time() - start_time)
        if resp.status_code >= 400:
            try:
                err = resp.json()
            except Exception:
                err = {"detail": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=err.get("detail", "Upstream error"))
        data = resp.json()
        print("LLM response:", data)  # Debug log
    except httpx.RequestError as e:
        LAT.observe(time.time() - start_time)
        raise HTTPException(status_code=502, detail=f"Model server not reachable: {e}") from e

    text = (
        data.get("generated_text")
        or (" ".join(data["generated_texts"]) if isinstance(data.get("generated_texts"), list) else None)
        or data.get("output")
        or data.get("text")
        or ""
    )
    usage_info = data.get("usage", {})

    # Update Prometheus counters
    PROMPT_TOKENS.labels(api_key=labels_id).inc(usage_info.get("prompt_tokens", 0))
    COMPLETION_TOKENS.labels(api_key=labels_id).inc(usage_info.get("completion_tokens", 0))
    TOTAL_TOKENS.labels(api_key=labels_id).inc(usage_info.get("total_tokens", 0))

    # Log usage in DB
    elapsed_ms = int((time.time() - start) * 1000)
    usage_entry = Usage(
        api_key_id=key.id,
        prompt_tokens=(usage_info or {}).get("prompt_tokens"),
        completion_tokens=(usage_info or {}).get("completion_tokens"),
        total_tokens=(usage_info or {}).get("total_tokens"),
        used_at=sa.func.now(),
        latency_ms=elapsed_ms,  # NEW
    )
    db.add(usage_entry)
    # Upsert per-key request counter
    db.execute(
        sa.text("""
        INSERT INTO api_key_stats (api_key_id, request_count, last_used_at)
        VALUES (:k, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(api_key_id) DO UPDATE SET
            request_count = api_key_stats.request_count + 1,
            last_used_at = CURRENT_TIMESTAMP
        """),
        {"k": key.id},
    )
    db.commit()

    # Respond with upstream data
    HTTP_REQS.labels(route="/generate", code="200").inc()
    GEN_LAT.observe(time.time() - start)
    return {"generated_text": text, "usage": usage_info}

#health check
@app.get("/health")
def health():
    return {"ok": True, "uptime_seconds": int(time.time() - APP_START_TIME)}

@app.get("/admin/system/health")
def system_health(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    # DB check
    try:
        db.execute(sa.text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # System (CPU + RAM only)
    cpu_pct = psutil.cpu_percent(interval=1.0)  # was 0.2s
    vm = psutil.virtual_memory()
    mem_pct = vm.percent
    mem_free_gb = round(vm.available / (1024**3), 2)

    # Model server ping (prefer /health, fallback to tiny /generate)
    model_ok = False
    model_latency_ms = None
    try:
        with httpx.Client(timeout=5.0) as client:
            t0 = time.time()
            # try /health if available
            health_url = MODEL_SERVER_URL.replace("/generate", "/health")
            r = client.get(health_url)
            if r.status_code == 200:
                model_ok = True
                model_latency_ms = int((time.time() - t0) * 1000)
            else:
                raise RuntimeError("health not 200")
    except Exception:
        try:
            with httpx.Client(timeout=10.0) as client:
                t0 = time.time()
                r = client.post(MODEL_SERVER_URL, json={"prompt": ["ping"], "max_new_tokens": 1})
                model_ok = r.status_code == 200
                model_latency_ms = int((time.time() - t0) * 1000)
        except Exception:
            model_ok = False

    return {
        "ok": db_ok and model_ok,
        "uptime_seconds": int(time.time() - APP_START_TIME),
        "system": {
            "cpu_percent": cpu_pct,
            "memory_percent": mem_pct,
            "free_memory_gb": mem_free_gb,
        },
        "model_server": {
            "url": MODEL_SERVER_URL,
            "ok": model_ok,
            "latency_ms": model_latency_ms,
        },
        "db": {"ok": db_ok},
        "gpu": None,  # CPU-only
    }

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/admin/stats/summary")
def stats_summary(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    company_id = ctx["company_id"]
    now_ts = int(time.time())
    cutoff_7d = datetime.utcnow() - timedelta(days=7)
    cutoff_30d = datetime.utcnow() - timedelta(days=30)

    # Projects (unchanged)
    projects_total = (
        db.query(sa.func.count(Project.id))
        .filter(Project.company_id == company_id)
        .scalar() or 0
    )
    projects_30d = (
        db.query(sa.func.count(Project.id))
        .filter(Project.company_id == company_id, Project.created_at >= cutoff_30d)
        .scalar() or 0
    )

    # Accurate API key counts (single source: DB)
    ak_row = (
        db.query(
            sa.func.sum(sa.case((APIKey.revoked == False, 1), else_=0)).label("active"),
            sa.func.sum(sa.case((APIKey.created_at >= cutoff_7d, 1), else_=0)).label("created_last_7d"),
            sa.func.count(APIKey.id).label("total"),
        )
        .join(Project, APIKey.project_id == Project.id)
        .filter(Project.company_id == company_id)
        .one()
    )
    active_keys = int(ak_row.active or 0)
    keys_7d = int(ak_row.created_last_7d or 0)

    # Requests (unchanged)
    usage_base = (
        db.query(sa.func.count(Usage.id))
        .join(APIKey, Usage.api_key_id == APIKey.id)
        .join(Project, APIKey.project_id == Project.id)
        .filter(Project.company_id == company_id)
    )
    total_requests = usage_base.scalar() or 0
    requests_30d = usage_base.filter(Usage.used_at >= cutoff_30d).scalar() or 0

    return {
        "measured_at": now_ts,
        "uptime_seconds": int(time.time() - APP_START_TIME),
        "projects": {"total": projects_total, "added_last_30d": projects_30d},
        "api_keys": {"active": active_keys, "created_last_7d": keys_7d, "total": int(ak_row.total or 0)},
        "requests": {"total": total_requests, "last_30d": requests_30d},
    }

@app.get("/admin/stats/projects/status")
def projects_status(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    company_id = ctx["company_id"]
    try:
        row = (
            db.query(
                sa.func.sum(sa.case((Project.status == "active", 1), else_=0)).label("active"),
                sa.func.sum(sa.case((Project.status == "paused", 1), else_=0)).label("paused"),
                sa.func.sum(sa.case((Project.status == "archived", 1), else_=0)).label("archived"),
                sa.func.count(Project.id).label("total"),
            )
            .filter(Project.company_id == company_id)
            .one()
        )
        return {
            "measured_at": int(time.time()),
            "active": int(row.active or 0),
            "paused": int(row.paused or 0),
            "archived": int(row.archived or 0),
            "total": int(row.total or 0),
        }
    except Exception:
        # If Project.status column doesn’t exist, fall back to total as active
        total = (
            db.query(sa.func.count(Project.id))
            .filter(Project.company_id == company_id)
            .scalar()
            or 0
        )
        return {
            "measured_at": int(time.time()),
            "active": int(total),
            "paused": 0,
            "archived": 0,
            "total": int(total),
        }

@app.get("/admin/stats/apikeys/status")
def apikeys_status(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    company_id = ctx["company_id"]
    active_expr = cast(case((APIKey.revoked == False, 1), else_=0), Integer)
    revoked_expr = cast(case((APIKey.revoked == True, 1), else_=0), Integer)

    row = (
        db.query(
            sa.func.coalesce(sa.func.sum(active_expr), 0).label("active"),
            sa.func.coalesce(sa.func.sum(revoked_expr), 0).label("revoked"),
            sa.func.count(APIKey.id).label("total"),
        )
        .join(Project, APIKey.project_id == Project.id)
        .filter(Project.company_id == company_id)
        .one()
    )

    return {
        "measured_at": int(time.time()),
        "active": int(row.active or 0),
        "revoked": int(row.revoked or 0),
        "total": int(row.total or 0),
    }

@app.get("/admin/stats/requests/weekly")
def requests_weekly(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    company_id = ctx["company_id"]
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=6)  # last 7 days including today

    # Group by calendar day
    d_col = sa.func.date(Usage.used_at)  # works on SQLite/Postgres
    rows = (
        db.query(d_col.label("d"), sa.func.count(Usage.id).label("c"))
        .join(APIKey, Usage.api_key_id == APIKey.id)
        .join(Project, APIKey.project_id == Project.id)
        .filter(Project.company_id == company_id, Usage.used_at >= datetime.combine(start_date, datetime.min.time()))
        .group_by("d")
        .all()
    )

    counts = {str(r.d): int(r.c) for r in rows if r.d is not None}
    series = []
    cur = start_date
    while cur <= today:
        key = str(cur)
        series.append({"date": key, "count": counts.get(key, 0)})
        cur += timedelta(days=1)

    return {
        "measured_at": int(time.time()),
        "days": series,  # [{date: 'YYYY-MM-DD', count: N}]
    }

# Ensure latency_ms column exists on SQLite (no-op if already present)
def _ensure_usage_latency_column():
    try:
        with engine.connect() as conn:
            dialect = conn.engine.dialect.name
            if dialect == "sqlite":
                cols = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(usage)")).fetchall()]
                if "latency_ms" not in cols:
                    conn.execute(sa.text("ALTER TABLE usage ADD COLUMN latency_ms INTEGER"))
    except Exception:
        pass

_ensure_usage_latency_column()

@app.get("/admin/metrics/requests/24h")
def requests_24h(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    company_id = ctx["company_id"]
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    since = now - timedelta(hours=23)

    dialect = db.get_bind().dialect.name
    if dialect == "sqlite":
        bucket = sa.func.strftime("%Y-%m-%d %H:00:00", Usage.used_at)
    else:
        bucket = sa.func.date_trunc("hour", Usage.used_at)

    rows = (
        db.query(bucket.label("h"), sa.func.count(Usage.id).label("c"))
        .join(APIKey, Usage.api_key_id == APIKey.id)
        .join(Project, APIKey.project_id == Project.id)
        # filter since (inclusive)
        .filter(Project.company_id == company_id, Usage.used_at >= since)
        .group_by("h")
        .order_by("h")
        .all()
    )

    # map results -> dict keyed by YYYY-MM-DDTHH
    by_hour = {}
    for r in rows:
        if dialect == "sqlite":
            key = str(r.h)[:13]  # 'YYYY-MM-DD HH' -> 'YYYY-MM-DD HH'
        else:
            key = (r.h if isinstance(r.h, datetime) else datetime.fromisoformat(str(r.h))).isoformat()[:13]
        by_hour[key.replace(" ", "T")] = int(r.c)

    points = []
    for i in range(23, -1, -1):
        t = now - timedelta(hours=i)
        key = t.isoformat()[:13]
        label = t.strftime("%H:00")
        points.append({"time": label, "requests": by_hour.get(key, 0)})

    return {"measured_at": int(time.time()), "points": points}

@app.get("/admin/metrics/latency/histogram")
def latency_histogram(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    company_id = ctx["company_id"]
    since = datetime.utcnow() - timedelta(hours=24)

    buckets = [
        ("0-50ms", 0, 50),
        ("50-100ms", 50, 100),
        ("100-200ms", 100, 200),
        ("200-500ms", 200, 500),
        ("500ms+", 500, None),
    ]

    # If column missing everywhere, return zeros
    try:
        dialect = db.get_bind().dialect.name
        if dialect == "sqlite":
            cols = [row[1] for row in db.execute(sa.text("PRAGMA table_info(usage)")).fetchall()]
            if "latency_ms" not in cols:
                return {"measured_at": int(time.time()), "buckets": [{"range": b[0], "count": 0} for b in buckets]}
    except Exception:
        pass

    cases = []
    for label, lo, hi in buckets:
        if hi is None:
            cond = Usage.latency_ms >= lo
        else:
            cond = sa.and_(Usage.latency_ms >= lo, Usage.latency_ms < hi)
        cases.append(sa.func.sum(sa.case((cond, 1), else_=0)).label(label))

    row = (
        db.query(*cases)
        .join(APIKey, Usage.api_key_id == APIKey.id)
        .join(Project, APIKey.project_id == Project.id)
        .filter(Project.company_id == company_id, Usage.used_at >= since)
        .one()
    )

    data = [{"range": label, "count": int(getattr(row, label) or 0)} for (label, _, _) in buckets]
    return {"measured_at": int(time.time()), "buckets": data}

@app.get("/admin/users")
def list_company_users(ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    rows = (
        db.query(User)
        .filter(User.company_id == ctx["company_id"])
        .order_by(User.created_at.desc(), User.id.desc())
        .all()
    )
    return [
        {"id": u.id, "username": u.username, "created_at": u.created_at}
        for u in rows
    ]

@app.post("/admin/users", status_code=201)
def create_company_user(payload: AdminCreateUserRequest, ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    username = (payload.username or "").strip()
    if not username or not payload.password:
        raise HTTPException(status_code=400, detail="username and password are required")

    exists = (
        db.query(User)
        .filter(User.company_id == ctx["company_id"], User.username == username)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Username already exists")

    user = User(
        company_id=ctx["company_id"],
        username=username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "created_at": user.created_at}

# Helper: get current user id from ctx whether it's a dict or an object
def _ctx_user_id(ctx) -> int | None:
    try:
        if isinstance(ctx, dict):
            if ctx.get("user_id") is not None:
                return int(ctx["user_id"])
            u = ctx.get("user")
            if u is None:
                return None
            return int(getattr(u, "id", u.get("id") if isinstance(u, dict) else None))
        # Fallback if ctx is an object
        uid = getattr(ctx, "user_id", None) or getattr(ctx, "id", None)
        return int(uid) if uid is not None else None
    except Exception:
        return None

@app.delete("/admin/users/{user_id}")
def delete_company_user(user_id: int, ctx=Depends(get_auth_context), db: Session = Depends(get_db)):
    company_id = ctx["company_id"]
    me = _ctx_user_id(ctx)

    # Detect if 'created_by' column exists (SQLite and others)
    has_created_by = False
    try:
        bind = db.get_bind()
        dialect = bind.dialect.name
        if dialect == "sqlite":
            cols = [row[1] for row in db.execute(sa.text("PRAGMA table_info(users)")).fetchall()]
            has_created_by = "created_by" in cols
        else:
            chk = db.execute(sa.text("""
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'created_by'
                LIMIT 1
            """)).first()
            has_created_by = bool(chk)
    except Exception:
        has_created_by = False

    # Load target user (and creator if available)
    if has_created_by:
        row = db.execute(
            sa.text("SELECT id, created_by FROM users WHERE id=:id AND company_id=:cid"),
            {"id": user_id, "cid": company_id},
        ).first()
    else:
        row = db.execute(
            sa.text("SELECT id FROM users WHERE id=:id AND company_id=:cid"),
            {"id": user_id, "cid": company_id},
        ).first()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    # Block deleting yourself
    try:
        if me is not None and int(row.id) == int(me):
            raise HTTPException(status_code=403, detail="You cannot delete your own account")
    except Exception:
        pass

    # If we track creator, only creator can delete
    if has_created_by:
        created_by = getattr(row, "created_by", None)
        if me is not None and created_by is not None and int(created_by) != int(me):
            raise HTTPException(status_code=403, detail="You can only delete users you created")
        result = db.execute(
            sa.text("DELETE FROM users WHERE id=:id AND company_id=:cid AND (created_by IS NULL OR created_by=:me)"),
            {"id": user_id, "cid": company_id, "me": me},
        )
    else:
        # No creator tracking; just delete within company (still prevents self-delete)
        result = db.execute(
            sa.text("DELETE FROM users WHERE id=:id AND company_id=:cid"),
            {"id": user_id, "cid": company_id},
        )

    db.commit()
    if getattr(result, "rowcount", 0) == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}

# Curated models file on disk
BASE_DIR = Path(__file__).parent
CURATED_DIR = BASE_DIR / "data"
CURATED_DIR.mkdir(exist_ok=True)
CURATED_MODELS_FILE = CURATED_DIR / "curated_models.json"

MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

download_jobs = {}  # job_id -> {"repo_id": ..., "status": ..., "percent": ..., "error": ...}

def _download_worker(job_id, repo_id, local_dir):
    try:
        download_jobs[job_id]["status"] = "running"
        # Simulate progress (replace with real chunked download for production)
        for i in range(1, 101):
            time.sleep(0.1)  # simulate work
            download_jobs[job_id]["percent"] = i
        # Real download
        snapshot_download(
            repo_id=repo_id,
            local_dir=str(local_dir),
            local_dir_use_symlinks=False,
            resume_download=True,
        )
        download_jobs[job_id]["status"] = "done"
        download_jobs[job_id]["percent"] = 100
        meta = {
            "id": repo_id,
            "repo_id": repo_id,
            "name": repo_id,
            "size": "",
            "downloadedAt": time.strftime("%Y-%m-%d"),
            "status": "ready",
            "usage": "0 requests"
        }
        meta_path = local_dir / "meta.json"
        with meta_path.open("w", encoding="utf-8") as f:
            json.dump(meta, f)
    except Exception as e:
        download_jobs[job_id]["status"] = "error"
        download_jobs[job_id]["error"] = str(e)

@app.get("/models/curated")
def get_curated_models(ctx=Depends(get_auth_context)):
    try:
        if not CURATED_MODELS_FILE.exists():
            raise FileNotFoundError("curated_models.json not found")
        with CURATED_MODELS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load curated models: {e}")

@app.post("/models/download")
def download_model(req: DownloadRequest, ctx=Depends(get_auth_context)):
    repo_id = req.repo_id.strip()
    if not repo_id:
        raise HTTPException(status_code=400, detail="repo_id required")
    local_dir = MODELS_DIR / repo_id.replace("/", "__")
    local_dir.mkdir(exist_ok=True)
    job_id = str(uuid.uuid4())
    download_jobs[job_id] = {
        "repo_id": repo_id,
        "status": "queued",
        "percent": 0,
        "error": None
    }
    t = threading.Thread(target=_download_worker, args=(job_id, repo_id, local_dir))
    t.start()
    return {"ok": True, "job_id": job_id}

@app.get("/models/jobs/{job_id}")
def get_download_job(job_id: str, ctx=Depends(get_auth_context)):
    job = download_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job