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

    def _ensure_listener(self):
        if not hasattr(self, 'listener_task') or self.listener_task is None:
            self.listener_task = asyncio.create_task(self._listen_results_async())

    async def _listen_results_async(self):
        while True:
            try:
                r = self._get_redis()
                if not r:
                    await asyncio.sleep(2)
                    continue

                result = await asyncio.to_thread(r.brpop, 'inference_results', 1)
                if result:
                    _, data = result
                    res = pickle.loads(data)
                    camera_id = res['camera_id']
                    
                    self.latest_detections = res.get('yolo_res', [])
                    session = self.get_session(camera_id)
                    if camera_id in self.active_sessions:
                        self.active_sessions[camera_id].is_analyzing = False
                        
                    raw_level = res.get('alert_level', 'Low')
                    
                    # Temporal Smoothing (Box kernel on alert integer levels)
                    level_map = {'Low': 0, 'Medium': 1, 'High': 2}
                    idx_map = {0: 'Low', 1: 'Medium', 2: 'High'}
                    
                    if not hasattr(session, 'alert_history'):
                        session.alert_history = deque(maxlen=5)
                    session.alert_history.append(level_map[raw_level])
                    
                    smoothed_val = int(round(sum(session.alert_history) / len(session.alert_history)))
                    alert_level = idx_map[smoothed_val]
                    
                    if alert_level in ['Medium', 'High']:
                        await self._create_alert(
                            camera_id, 
                            alert_level, 
                            res.get('weapon_conf', 0.0), 
                            res.get('fight_conf', 0.0), 
                            res.get('scream_conf', 0.0), 
                            res.get('weapon_name')
                        )
            except Exception as e:
                print(f"Redis listener error: {e}")
                await asyncio.sleep(1)

