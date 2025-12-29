"""
Dataset upload and management API endpoints
Handles CSV/Excel upload, parsing, validation, and storage
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
import pandas as pd
import io
from datetime import datetime
from pathlib import Path

from app.schemas.dataset import (
    DatasetType, FileFormat, DatasetUploadResponse,
    InmateProfile, BehavioralRecord, ProgramOutcome,
    CounselingNote, EarlyReleaseData, IndustrialTrainingRecord,
    HomeLeaveRecord, RehabStation
)
from app.utils.realistic_dataset_generator import generate_rehabilitation_datasets
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Dataset Upload"])

# Storage for uploaded datasets (in production, use database)
DATASET_STORAGE = {
    "inmate_profiles": None,
    "behavioral_records": None,
    "program_outcomes": None,
    "counseling_notes": None,
    "early_release_data": None,
    "industrial_training": None,
    "home_leave_records": None,  # Changed from home_leave to home_leave_records
    "rehab_stations": None
}


def parse_uploaded_file(file_content: bytes, file_format: str) -> pd.DataFrame:
    """Parse uploaded file content into DataFrame"""
    try:
        if file_format in ["csv"]:
            df = pd.DataFrame(pd.read_csv(io.BytesIO(file_content)))
        elif file_format in ["excel", "xlsx", "xls"]:
            df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
        else:
            raise ValueError(f"Unsupported file format: {file_format}")
        
        return df
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")


def validate_dataset(df: pd.DataFrame, dataset_type: DatasetType) -> List[str]:
    """Validate dataset schema and data quality"""
    errors = []
    
    # Define required columns for each dataset type
    required_columns = {
        DatasetType.INMATE_PROFILES: [
            "inmate_id", "booking_number", "first_name", "last_name",
            "date_of_birth", "gender", "age", "behavior_score",
            "discipline_score", "risk_score"
        ],
        DatasetType.BEHAVIORAL_RECORDS: [
            "record_id", "inmate_id", "incident_date", "incident_type", "severity"
        ],
        DatasetType.PROGRAM_OUTCOMES: [
            "outcome_id", "inmate_id", "program_name", "program_type",
            "start_date", "status", "completion_percentage"
        ],
        DatasetType.COUNSELING_NOTES: [
            "note_id", "inmate_id", "session_date", "notes"
        ],
        DatasetType.EARLY_RELEASE_DATA: [
            "record_id", "inmate_id", "assessment_date", "eligibility_score", "recommendation"
        ],
        DatasetType.INDUSTRIAL_TRAINING: [
            "training_id", "inmate_id", "training_program", "start_date", "hours_completed"
        ],
        DatasetType.HOME_LEAVE: [
            "leave_id", "inmate_id", "request_date", "leave_type", "approval_status"
        ],
        DatasetType.REHAB_STATIONS: [
            "station_id", "station_name", "location", "zone", "capacity"
        ]
    }
    
    # Check required columns
    if dataset_type in required_columns:
        required = required_columns[dataset_type]
        missing = set(required) - set(df.columns)
        if missing:
            errors.append(f"Missing required columns: {', '.join(missing)}")
    
    # Check for duplicate IDs
    if dataset_type == DatasetType.INMATE_PROFILES and "inmate_id" in df.columns:
        duplicates = df["inmate_id"].duplicated().sum()
        if duplicates > 0:
            errors.append(f"Found {duplicates} duplicate inmate IDs")
    
    # Check data types and ranges
    if dataset_type == DatasetType.INMATE_PROFILES:
        if "behavior_score" in df.columns:
            invalid_behavior = ((df["behavior_score"] < 0) | (df["behavior_score"] > 100)).sum()
            if invalid_behavior > 0:
                errors.append(f"{invalid_behavior} records have invalid behavior_score (must be 0-100)")
        
        if "risk_score" in df.columns:
            invalid_risk = ((df["risk_score"] < 0) | (df["risk_score"] > 1)).sum()
            if invalid_risk > 0:
                errors.append(f"{invalid_risk} records have invalid risk_score (must be 0-1)")
    
    return errors


@router.post("/file", response_model=DatasetUploadResponse)
async def upload_dataset_file(
    file: UploadFile = File(...),
    dataset_type: DatasetType = Form(...),
    replace_existing: bool = Form(False),
    description: Optional[str] = Form(None)
):
    """
    Upload and process a dataset file (CSV or Excel)
    
    - **file**: CSV or Excel file containing the dataset
    - **dataset_type**: Type of dataset being uploaded
    - **replace_existing**: Whether to replace existing data
    - **description**: Optional description of the upload
    """
    try:
        logger.info(f"Processing upload for dataset type: {dataset_type}")
        
        # Read file content
        content = await file.read()
        
        # Determine file format from extension
        file_ext = file.filename.split('.')[-1].lower()
        if file_ext == "csv":
            file_format = "csv"
        elif file_ext in ["xlsx", "xls"]:
            file_format = "excel"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
        
        # Parse file
        df = parse_uploaded_file(content, file_format)
        logger.info(f"Parsed {len(df)} records from file")
        
        # Validate data
        validation_errors = validate_dataset(df, dataset_type)
        
        if validation_errors and not replace_existing:
            logger.warning(f"Validation errors found: {validation_errors}")
            return DatasetUploadResponse(
                success=False,
                message=f"Validation failed. Found {len(validation_errors)} error(s).",
                dataset_type=dataset_type,
                records_count=len(df),
                validation_errors=validation_errors,
                sample_records=[],
                upload_timestamp=datetime.now()
            )
        
        # Store dataset
        storage_key = dataset_type.value
        
        if replace_existing or DATASET_STORAGE[storage_key] is None:
            DATASET_STORAGE[storage_key] = df
            action = "replaced" if replace_existing else "stored"
        else:
            # Append to existing data
            DATASET_STORAGE[storage_key] = pd.concat([DATASET_STORAGE[storage_key], df], ignore_index=True)
            action = "appended"
        
        logger.info(f"Dataset {action}: {storage_key} with {len(df)} records")
        
        # Prepare sample records
        sample_size = min(3, len(df))
        # Replace NaN with None for JSON compatibility
        sample_records = df.head(sample_size).replace({float('nan'): None}).to_dict('records')
        
        return DatasetUploadResponse(
            success=True,
            message=f"Successfully {action} {len(df)} records for {dataset_type.value}",
            dataset_type=dataset_type,
            records_count=len(df),
            validation_errors=validation_errors,
            sample_records=sample_records,
            upload_timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error uploading dataset: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/generate-sample", response_model=DatasetUploadResponse)
async def generate_sample_datasets(
    n_inmates: int = Query(1000, ge=100, le=10000, description="Number of inmates to generate"),
    dataset_types: Optional[List[DatasetType]] = Query(None, description="Specific datasets to generate")
):
    """
    Generate realistic sample datasets for testing
    
    - **n_inmates**: Number of inmate profiles to generate (100-10000)
    - **dataset_types**: Specific datasets to generate (if empty, generates all)
    """
    try:
        logger.info(f"Generating sample datasets for {n_inmates} inmates...")
        
        # Generate all datasets
        datasets = generate_rehabilitation_datasets(n_inmates=n_inmates, save=False)
        logger.info(f"Generated {len(datasets)} datasets")
        
        # Store datasets
        for key, df in datasets.items():
            DATASET_STORAGE[key] = df
            logger.info(f"Stored {key}: {len(df)} records")
        
        logger.info(f"DATASET_STORAGE now has: {list(DATASET_STORAGE.keys())}")
        logger.info(f"inmate_profiles is None: {DATASET_STORAGE['inmate_profiles'] is None}")
        
        # If specific types requested, only return those
        if dataset_types:
            total_records = sum(len(datasets[dt.value]) for dt in dataset_types if dt.value in datasets)
        else:
            total_records = sum(len(df) for df in datasets.values())
        
        return DatasetUploadResponse(
            success=True,
            message=f"Successfully generated {len(datasets)} datasets with {total_records} total records",
            dataset_type=DatasetType.INMATE_PROFILES,  # Primary dataset
            records_count=total_records,
            validation_errors=[],
            sample_records=[],
            upload_timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error generating sample datasets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.get("/status")
async def get_dataset_status():
    """Get status of all uploaded datasets"""
    status = {}
    
    logger.info(f"DEBUG: DATASET_STORAGE id = {id(DATASET_STORAGE)}")
    logger.info(f"DEBUG: inmate_profiles is None: {DATASET_STORAGE['inmate_profiles'] is None}")
    
    for dataset_type, df in DATASET_STORAGE.items():
        if df is not None:
            status[dataset_type] = {
                "loaded": True,
                "record_count": len(df),
                "columns": list(df.columns),
                "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2)
            }
        else:
            status[dataset_type] = {
                "loaded": False,
                "record_count": 0
            }
    
    return status


@router.get("/dataset/{dataset_type}")
async def get_dataset(
    dataset_type: DatasetType,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Retrieve stored dataset with pagination"""
    storage_key = dataset_type.value
    
    if DATASET_STORAGE[storage_key] is None:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_type} not found")
    
    df = DATASET_STORAGE[storage_key]
    
    # Apply pagination
    paginated_df = df.iloc[offset:offset+limit]
    
    return {
        "dataset_type": dataset_type,
        "total_records": len(df),
        "returned_records": len(paginated_df),
        "offset": offset,
        "limit": limit,
        "data": paginated_df.replace({float('nan'): None}).to_dict('records')
    }


@router.delete("/dataset/{dataset_type}")
async def delete_dataset(dataset_type: DatasetType):
    """Delete a stored dataset"""
    storage_key = dataset_type.value
    
    if DATASET_STORAGE[storage_key] is None:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_type} not found")
    
    record_count = len(DATASET_STORAGE[storage_key])
    DATASET_STORAGE[storage_key] = None
    
    return {
        "success": True,
        "message": f"Deleted {record_count} records from {dataset_type}"
    }


@router.post("/export/{dataset_type}")
async def export_dataset(dataset_type: DatasetType, file_format: FileFormat = FileFormat.CSV):
    """Export dataset to file"""
    from fastapi.responses import StreamingResponse
    
    storage_key = dataset_type.value
    
    if DATASET_STORAGE[storage_key] is None:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_type} not found")
    
    df = DATASET_STORAGE[storage_key]
    
    # Create file buffer
    buffer = io.BytesIO()
    
    if file_format == FileFormat.CSV:
        df.to_csv(buffer, index=False)
        media_type = "text/csv"
        filename = f"{dataset_type.value}.csv"
    else:
        df.to_excel(buffer, index=False, engine='openpyxl')
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{dataset_type.value}.xlsx"
    
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/statistics")
async def get_dataset_statistics():
    """Get statistical summary of all datasets"""
    stats = {}
    
    for dataset_type, df in DATASET_STORAGE.items():
        if df is not None and len(df) > 0:
            stats[dataset_type] = {
                "total_records": len(df),
                "columns": list(df.columns),
                "sample_values": {}
            }
            
            # Add some basic stats for numeric columns
            numeric_cols = df.select_dtypes(include=['number']).columns
            for col in numeric_cols[:5]:  # Limit to first 5 numeric columns
                stats[dataset_type]["sample_values"][col] = {
                    "mean": round(float(df[col].mean()), 2),
                    "min": round(float(df[col].min()), 2),
                    "max": round(float(df[col].max()), 2)
                }
    
    return stats


# Export the router and storage for use in other modules
__all__ = ['router', 'DATASET_STORAGE']
