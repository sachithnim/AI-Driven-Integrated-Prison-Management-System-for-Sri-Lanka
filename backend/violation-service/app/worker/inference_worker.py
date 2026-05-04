import redis
import pickle
import time
import numpy as np
import asyncio
import nest_asyncio
from collections import deque

# To avoid "Event loop is already running" if models use threads/asyncio internally in a strange way
nest_asyncio.apply()

from app.models.yolo_detector import YoloDetector
from app.models.audio_detector import AudioDetector
from app.models.action_detector import ActionDetector
from app.models.fusion_model import FusionMLP

print("Initializing AI Services in Worker...")
yolo = YoloDetector()
audio = AudioDetector()
action = ActionDetector()
fusion = FusionMLP()

import os
redis_host = os.environ.get('REDIS_HOST', 'localhost')
redis_client = redis.Redis(host=redis_host, port=6379, db=0)
print("Worker connected to Redis.")

# Per-camera audio temporal smoothing state
# Keeps the last N audio confidence scores to smooth out flickering detections
audio_history = {}  # camera_id -> deque of (scream_conf, scream_name)
AUDIO_SMOOTH_WINDOW = 5  # Number of recent frames to average over

def get_smoothed_audio(camera_id, raw_conf, raw_name):
    """
    Apply temporal smoothing to audio detections.
    Returns (smoothed_conf, best_name) — averaged confidence and the
    class name associated with the highest recent detection.
    """
    if camera_id not in audio_history:
        audio_history[camera_id] = deque(maxlen=AUDIO_SMOOTH_WINDOW)
    
    audio_history[camera_id].append((raw_conf, raw_name))
    
    history = audio_history[camera_id]
    
    # Smoothed confidence = average of recent scores
    avg_conf = sum(h[0] for h in history) / len(history)
    
    # Best name = name from the frame with the highest confidence in the window
    best_entry = max(history, key=lambda h: h[0])
    best_name = best_entry[1]
    
    # If smoothed conf is above threshold but raw_name is None, use historical best
    if avg_conf > 0.15 and best_name is None:
        # Find any non-None name in recent history
        for h in sorted(history, key=lambda x: x[0], reverse=True):
            if h[1] is not None:
                best_name = h[1]
                break
    
    return avg_conf, best_name

def process_task():
    while True:
        try:
            # Block until a task is available
            result = redis_client.brpop('inference_tasks', timeout=1)
            if not result:
                continue
                
            _, data = result
            task = pickle.loads(data)
            
            camera_id = task['camera_id']
            current_frame = task['current_frame']
            video_buffer = task['video_buffer']
            audio_buffer = task['audio_buffer']
            
            print(f"[{time.strftime('%H:%M:%S')}] Processing task for Camera {camera_id}")
            
            # 1. Object Detection
            yolo_res = yolo.detect(current_frame)
            weapon_conf = 0.0
            weapon_name = None
            for d in yolo_res:
                if d['class'].lower() in ['knife', 'gun', 'pistol', 'weapon']:
                    if d['conf'] > weapon_conf:
                        weapon_conf = d['conf']
                        weapon_name = d['class']
                        
            # 2. Action Recognition
            fight_conf = 0.0
            if len(video_buffer) >= 16:
                try:
                    action_res = action.predict(video_buffer)
                    fight_conf = max([d['score'] for d in action_res if d['is_violent']], default=0.0)
                except Exception as e:
                    print(f"Action recognition failed: {e}")
                    
            # 3. Audio Analysis — Use up to 3 seconds (48000 samples) for better context
            scream_conf = 0.0
            scream_name = None
            audio_emb = None
            # Require at least 0.5s (8000 samples) of audio, prefer 3s (48000)
            if len(audio_buffer) >= 8000:
                try:
                    # Use up to 3 seconds of audio for better classification
                    num_samples = min(len(audio_buffer), 48000)
                    waveform = np.array(list(audio_buffer)[-num_samples:], dtype=np.float32)
                    audio_res, audio_emb_out = audio.predict(waveform)
                    violent_audios = [d for d in audio_res if d['is_violent']]
                    if violent_audios:
                        top_audio = max(violent_audios, key=lambda x: x['score'])
                        scream_conf = top_audio['score']
                        scream_name = top_audio['class']
                    audio_emb = audio_emb_out
                except Exception as e:
                    print(f"Audio detection failed: {e}")
            
            # Apply audio temporal smoothing
            scream_conf, scream_name = get_smoothed_audio(camera_id, scream_conf, scream_name)
                    
            # 4. Fusion
            alert_level, confidence = fusion.predict(weapon_conf, fight_conf, audio_emb, scream_conf)
            
            # Send results back
            res_data = {
                'camera_id': camera_id,
                'yolo_res': yolo_res,
                'alert_level': alert_level,
                'weapon_conf': weapon_conf,
                'weapon_name': weapon_name,
                'fight_conf': fight_conf,
                'scream_conf': scream_conf,
                'scream_name': scream_name
            }
            redis_client.lpush('inference_results', pickle.dumps(res_data))
            
        except Exception as e:
            print(f"Worker Error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    print("Starting Inference Worker Loop...")
    process_task()
