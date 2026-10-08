"""TadbirGo — FastAPI application entry point."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .seed import seed_if_empty
from .api import admin_routes, auth_routes, booking_routes, catalog, misc_routes, seller_routes

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "frontend", "dist")

db.init_db()
seed_if_empty()

app = FastAPI(title="TadbirGo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(catalog.router)
app.include_router(booking_routes.router)
app.include_router(seller_routes.router)
app.include_router(admin_routes.router)
app.include_router(misc_routes.router)

app.mount("/media", StaticFiles(directory=os.path.join(BASE_DIR, "media")), name="media")


@app.get("/api/health")
def health():
    return {"ok": True, "app": "TadbirGo", "version": "1.0.0"}


# ---- SPA static serving (built frontend) ----
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
