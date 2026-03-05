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

    async def process_live_frame(self, camera_id: int, frame_bytes: bytes):
        """
        Process a single video frame from a live source (WebSocket).
        """
        self._ensure_listener()
        session = self.get_session(camera_id)
        
        # Decode JPEG
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return

        # Update Buffer
        session.frame_buffer.append(img)

        # Update Global Latest Frame (for debug view)
        self.latest_frame = frame_bytes

        current_time = time.time()
        if current_time - session.last_processed > session.process_interval:
            # Run Analysis via Redis Queue
            if not session.is_analyzing:
                session.is_analyzing = True
                async def push_task(img_copy, f_buf, a_buf, cid):
                    try:
                        r = self._get_redis()
                        if not r:
                            print("Redis unavailable, dropping task")
                            session.is_analyzing = False
                            return

                        task_data = {
                            'camera_id': cid,
                            'current_frame': img_copy,
                            'video_buffer': f_buf,
                            'audio_buffer': a_buf,
                            'timestamp': time.time()
                        }
                        await asyncio.to_thread(r.lpush, 'inference_tasks', pickle.dumps(task_data))
                    except Exception as e:
                        print(f"Error pushing task: {e}")
                        session.is_analyzing = False
                
                asyncio.create_task(push_task(img.copy(), list(session.frame_buffer), list(session.audio_buffer), camera_id))
            session.last_processed = current_time

            # Visualization: Draw bounding boxes from latest YOLO results
            # We need to access the latest detections. Since _analyze_frame runs async, 
            # we can store the latest detections in self.latest_detections
            if hasattr(self, 'latest_detections'):
                for det in self.latest_detections:
                    x1, y1, x2, y2 = map(int, det['bbox'])
                    label = f"{det['class']} {det['conf']:.2f}"
                    color = (0, 255, 0) # Green for normal objects
                    if det['class'] in ['knife', 'gun', 'pistol', 'weapon']:
                        color = (0, 0, 255) # Red for weapons
                    elif det['class'] in ['person']:
                        color = (255, 0, 0) # Blue for persons

                    cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(img, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

            ret, buffer = cv2.imencode('.jpg', img)
            if ret:
                self.latest_frame = buffer.tobytes()

    async def process_live_audio(self, camera_id: int, audio_bytes: bytes):
        """
        Process audio chunk (Assume 16kHz Mono PCM 16-bit).
        """
        session = self.get_session(camera_id)
        
        # Convert bytes to numpy array (int16 -> float32)
        audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0
        
        session.audio_buffer.extend(audio_float32)

