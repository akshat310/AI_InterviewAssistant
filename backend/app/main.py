from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.db.init_db import init_db
from app.api.interview import router as interview_router

settings = get_settings()

# Initialize database tables on startup
init_db()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────
app.include_router(interview_router)


# ── Root routes ──────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running 🚀",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy ✅"}


@app.get("/test-gemini", tags=["Test"])
async def test_gemini():
    from app.core.interviewer import test_gemini_connection
    try:
        response = test_gemini_connection()
        return {"status": "connected ✅", "gemini_says": response}
    except Exception as e:
        return {"status": "failed ❌", "error": str(e)}


@app.get("/list-models", tags=["Test"])
async def list_models():
    import google.generativeai as genai
    models = [m.name for m in genai.list_models()]
    return {"available_models": models}