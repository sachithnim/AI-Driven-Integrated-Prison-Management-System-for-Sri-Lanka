import os
import av
import cv2
import numpy as np
import asyncio
import time
from sqlalchemy.orm import Session
from app.db import models
import json
from datetime import datetime, timezone
from collections import deque
import redis
import pickle

class LiveSession:
    """
    Manages state for a live push-based stream (WebSocket).
    """
    def __init__(self, camera_id):
        self.camera_id = camera_id
        self.frame_buffer = deque(maxlen=16)
        self.audio_buffer = deque(maxlen=80000)
        self.last_processed = time.time()
        self.process_interval = 0.2 # 5 FPS analysis
        self.latest_detections = []
        self.is_analyzing = False

class ViolenceDetectorService:
    def __init__(self, db: Session = None):
        self.db = db
        self.redis = None
        self.listener_task = None
        self.is_running = False
        self.latest_frame = None
        self.active_sessions = {} # camera_id -> LiveSession
        self._get_redis() # Try to connect initially

    def _get_redis(self):
        if self.redis is None:
            try:
                redis_host = os.environ.get('REDIS_HOST', 'localhost')
                r = redis.Redis(host=redis_host, port=6379, db=0, socket_connect_timeout=2)
                r.ping()
                self.redis = r
                print("Successfully connected to Redis!")
                try:
                    self.redis.delete('inference_tasks')
                    self.redis.delete('inference_results')
                except:
                    pass
            except Exception as e:
                self.redis = None
        return self.redis

    def get_latest_frame(self):
        """Returns the latest processed frame (JPEG encoded)."""
        return self.latest_frame

    def get_session(self, camera_id: int) -> LiveSession:
        if camera_id not in self.active_sessions:
            self.active_sessions[camera_id] = LiveSession(camera_id)
        return self.active_sessions[camera_id]

    def remove_session(self, camera_id: int):
        if camera_id in self.active_sessions:
            del self.active_sessions[camera_id]

