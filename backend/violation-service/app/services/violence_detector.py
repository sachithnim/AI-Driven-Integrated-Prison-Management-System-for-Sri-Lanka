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
        self.frame_buffer = deque(maxlen=45) # ~3s buffer at 15fps
        self.audio_buffer = deque(maxlen=80000)
        self.last_processed = time.time()
        self.process_interval = 0.2 # 5 FPS analysis
        self.latest_detections = []
        self.is_analyzing = False
        
        # Video recording state
        self.video_writer = None
        self.recording_frames_left = 0
        self.recording_incident_id = None

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
                            res.get('weapon_name'),
                            res.get('scream_name')
                        )
            except Exception as e:
                print(f"Redis listener error: {e}")
                await asyncio.sleep(1)

    def _handle_recording(self, session, img):
        if hasattr(session, 'video_writer') and session.video_writer is not None:
            session.video_writer.write(img)
            session.recording_frames_left -= 1
            if session.recording_frames_left <= 0:
                session.video_writer.release()
                session.video_writer = None
                inc_id = session.recording_incident_id
                session.recording_incident_id = None
                
                async def update_db_video_path(i_id):
                    from app.db.base import SessionLocal
                    from app.db.models import Incident
                    db_local = SessionLocal()
                    try:
                        inc = db_local.query(Incident).filter(Incident.id == i_id).first()
                        if inc:
                            inc.video_path = f"/static/incidents/incident_{i_id}.webm"
                            db_local.commit()
                    except Exception as e:
                        print(f"Error updating video path: {e}")
                    finally:
                        db_local.close()
                asyncio.create_task(update_db_video_path(inc_id))

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
        
        # Handle Video Recording
        self._handle_recording(session, img)

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

    async def process_stream(self, rtsp_url: str, camera_id: int):
        """
        Main loop to process video/audio stream (RTSP Pull).
        """
        self.is_running = True
        container = None
        self._ensure_listener()
        try:
            container = av.open(rtsp_url)
            # Select streams
            video_stream = container.streams.video[0]
            audio_stream = container.streams.audio[0] if container.streams.audio else None

            print(f"Started processing stream: {rtsp_url}")
            
            session = self.get_session(camera_id)
            
            # resampler initialization
            resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)

            for packet in container.demux(video_stream, audio_stream):
                if not self.is_running:
                    break


                for frame in packet.decode():
                    if packet.stream.type == 'video':
                        # Yield control to event loop to allow WebSocket pings/pongs
                        await asyncio.sleep(0.01) 

                        # Convert to numpy image for YOLO & X3D
                        img = frame.to_ndarray(format='bgr24')
                        session.frame_buffer.append(img)
                        
                        # Handle Video Recording
                        self._handle_recording(session, img)
                        
                        current_time = time.time()
                        
                        # Run Analysis via Redis Queue
                        if current_time - session.last_processed > session.process_interval:
                            if not session.is_analyzing:
                                session.is_analyzing = True
                                async def push_rtsp_task(img_copy, f_buf, a_buf, cid):
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
                                
                                asyncio.create_task(push_rtsp_task(img.copy(), list(session.frame_buffer), list(session.audio_buffer), camera_id))
                            session.last_processed = current_time

                        # Visualization: Draw bounding boxes from latest YOLO results
                        # We need to access the latest detections. Since _analyze_frame runs async, 
                        # we can store the latest detections in self.latest_detections
                        if hasattr(self, 'latest_detections'):
                            for det in self.latest_detections:
                                x1, y1, x2, y2 = map(int, det['bbox'])
                                label = f"{det['class']} {det['conf']:.2f}"
                                color = (0, 255, 0) # Green for normal objects
                                if det['class'].lower() in ['knife', 'gun', 'pistol', 'weapon']:
                                    color = (0, 0, 255) # Red for weapons
                                elif det['class'].lower() in ['person']:
                                    color = (255, 0, 0) # Blue for persons

                                cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
                                cv2.putText(img, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                        ret, buffer = cv2.imencode('.jpg', img)
                        if ret:
                            self.latest_frame = buffer.tobytes()

                    elif packet.stream.type == 'audio':
                         # Collect audio samples
                         frame.pts = None # avoiding some av sync issues if helpful, usually not needed for simple decoding
                         resampled_frames = resampler.resample(frame)
                         for f in resampled_frames:
                             # f.to_ndarray() returns (1, samples) for mono, we need flat array
                             audio_samples = f.to_ndarray().flatten()
                             session.audio_buffer.extend(audio_samples)

        except Exception as e:
            print(f"Error processing stream {rtsp_url}: {e}")
        finally:
            if container:
                container.close()
            self.remove_session(camera_id)



    async def _create_alert(self, camera_id, level, weapon_score, fight_score, audio_score, weapon_name=None, audio_name=None):
        """
        Broadcast alert to WebSocket clients.
        """
        from app.api.endpoints.stream import manager
        
        msg = f"Detected {level} priority incident. "
        if weapon_name and weapon_score > 0.4:
             msg += f"Weapon: {weapon_name} ({weapon_score:.2f}). "
        else:
             msg += f"Weapon: {weapon_score:.2f}. "
             
        msg += f"Fight: {fight_score:.2f}, Audio: {audio_score:.2f}"

        # Insert Alert and Handle Incident Cooldown via PostgreSQL
        def db_logic():
            # Get SessionLocal
            from app.db.base import SessionLocal
            from app.db.models import Incident, Alert, Camera
            from sqlalchemy import desc
            from datetime import timezone
            
            db = self.db if self.db else SessionLocal()
            try:
                last_incident = db.query(Incident).filter(Incident.camera_id == camera_id).order_by(desc(Incident.timestamp)).first()
                # Check 30 seconds cooldown
                now = datetime.now(timezone.utc)
                incident_id = None
                is_new_incident = False
                
                cam_location = "Unknown"
                cam = db.query(Camera).filter(Camera.id == camera_id).first()
                if not cam:
                    cam = Camera(id=camera_id, location="Unknown", status="active")
                    db.add(cam)
                    db.commit()
                else:
                    cam_location = cam.location
                    
                if last_incident and last_incident.timestamp:
                    # convert to naive if needed, or both to utc
                    time_diff = now - last_incident.timestamp
                    if time_diff.total_seconds() < 30:
                        incident_id = last_incident.id
                        last_incident.timestamp = now
                        if level == 'High':
                             last_incident.severity = 'High'
                
                if not incident_id:
                    is_new_incident = True
                    fight_str = 'Yes' if fight_score > 0.3 else 'No'
                    new_inc = Incident(camera_id=camera_id, type="Violence", severity=level, description=f"Weapon: {weapon_name or 'None'}, Fight: {fight_str}, Audio: {audio_name or 'None'}")
                    db.add(new_inc)
                    db.commit()
                    db.refresh(new_inc)
                    incident_id = new_inc.id
                    
                new_alert = Alert(incident_id=incident_id, message=msg)
                db.add(new_alert)
                db.commit()
                return incident_id, is_new_incident, cam_location
            except Exception as e:
                print(f"DB Error creating alert: {e}")
                return None, False, "Unknown"
            finally:
                if not self.db:
                    db.close()
                    
        db_res = await asyncio.to_thread(db_logic)
        incident_id = None
        cam_location = "Unknown"
        
        if db_res:
            incident_id, is_new_incident, cam_location = db_res
            if is_new_incident:
                session = self.get_session(camera_id)
                if getattr(session, 'video_writer', None) is None:
                    try:
                        os.makedirs("app/static/incidents", exist_ok=True)
                        if len(session.frame_buffer) > 0:
                            h, w = session.frame_buffer[-1].shape[:2]
                        else:
                            h, w = 480, 640
                        
                        fourcc = cv2.VideoWriter_fourcc(*'VP80')
                        video_path = f"app/static/incidents/incident_{incident_id}.webm"
                        session.video_writer = cv2.VideoWriter(video_path, fourcc, 15.0, (w, h))
                        session.recording_incident_id = incident_id
                        
                        for frame in list(session.frame_buffer):
                            session.video_writer.write(frame)
                            
                        session.recording_frames_left = 150
                    except Exception as e:
                        print(f"Error initializing video writer: {e}")

        alert_data = {
            "incident_id": incident_id,
            "level": level,
            "camera_id": camera_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": msg,
            "weapon_score": float(weapon_score),
            "weapon_name": weapon_name,
            "fight_score": float(fight_score),
            "audio_score": float(audio_score),
            "audio_name": audio_name,
            "camera_location": cam_location
        }

        # print(f"Broadcasting Alert: {alert_data}")
        await manager.broadcast(json.dumps(alert_data))

# Global Singleton Instance
detector = ViolenceDetectorService()
