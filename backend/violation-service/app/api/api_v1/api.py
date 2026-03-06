from fastapi import APIRouter
from app.api.endpoints import incidents, stream, reports

api_router = APIRouter()
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(stream.router, tags=["stream"])
