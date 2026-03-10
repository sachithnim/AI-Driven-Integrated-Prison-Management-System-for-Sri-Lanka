import redis
import pickle
import time
import numpy as np
import asyncio
import nest_asyncio

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
                    
            # 3. Audio Analysis
            scream_conf = 0.0
            scream_name = None
            audio_emb = None
            if len(audio_buffer) >= 16000:
                try:
                    waveform = np.array(audio_buffer[-16000:], dtype=np.float32)
                    audio_res, audio_emb_out = audio.predict(waveform)
                    violent_audios = [d for d in audio_res if d['is_violent']]
                    if violent_audios:
                        top_audio = max(violent_audios, key=lambda x: x['score'])
                        scream_conf = top_audio['score']
                        scream_name = top_audio['class']
                    audio_emb = audio_emb_out
                except Exception as e:
                    print(f"Audio detection failed: {e}")
                    
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
