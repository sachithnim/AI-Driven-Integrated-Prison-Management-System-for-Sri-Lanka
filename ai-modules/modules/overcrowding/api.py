from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from .service import HeadCountService, CellAllocationService

router = APIRouter()
head_count_service = HeadCountService()
cell_allocation_service = CellAllocationService()

class CellData(BaseModel):
    id: str
    block: str
    cell_number: str
    capacity: int
    current_count: int

class InmateData(BaseModel):
    id: str
    security_level: str
    gender: str

class AllocationRequest(BaseModel):
    inmate: InmateData
    cells: List[CellData]

@router.post("/detect-head-count")
async def detect_head_count(file: UploadFile = File(...)):
    contents = await file.read()
    result = head_count_service.detect_count(contents)
    return result

@router.post("/suggest-allocation")
async def suggest_allocation(request: AllocationRequest):
    suggestions = cell_allocation_service.suggest_allocation(
        request.inmate.model_dump(),
        [cell.model_dump() for cell in request.cells]
    )
    return {"suggestions": suggestions}

@router.get("/health")
async def health_check():
    return {"status": "healthy", "module": "overcrowding"}
