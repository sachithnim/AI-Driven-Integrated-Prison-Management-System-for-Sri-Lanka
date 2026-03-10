from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.sql import func
from .base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="staff")  # admin, staff

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String, index=True)
    rtsp_url = Column(String)
    status = Column(String, default="active")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    type = Column(String)  # Violence, Weapon, Scream
    severity = Column(String)  # Low, Medium, High
    description = Column(Text)
    video_path = Column(String, nullable=True) # Path to saved snippet

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    message = Column(String)
    is_read = Column(Boolean, default=False)

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    level = Column(String) # INFO, ERROR, WARNING
    message = Column(Text)
