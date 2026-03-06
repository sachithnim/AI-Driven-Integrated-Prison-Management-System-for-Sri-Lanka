import time
import numpy as np
import torch
from app.models.yolo_detector import YoloDetector
# from app.models.mobile_video import ActionDetector # Removed incorrect import
from app.models.action_detector import ActionDetector
from app.models.audio_detector import AudioDetector
from app.models.fusion_model import FusionMLP

def benchmark():
    print("="*50)
    print("Prison Violation Detection System - Performance Benchmark")
    print("="*50)
    
    # 1. Load Models
    print("Loading Models...")
    t0 = time.time()
    yolo = YoloDetector()
    try:
        action = ActionDetector()
    except Exception as e:
        print(f"Action model failed load (likely missing dependency): {e}")
        action = None
    
    try:
        audio = AudioDetector()
    except Exception as e:
        print(f"Audio model failed load: {e}")
        audio = None
        
    fusion = FusionMLP()
    print(f"Models loaded in {time.time() - t0:.2f} seconds.")
    
    # 2. Prepare Dummy Data
    dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
    dummy_audio = np.zeros(16000, dtype=np.float32) # 1 sec
    dummy_video_tensor = torch.randn(1, 3, 13, 160, 160) # Action tensor
    
    iterations = 50
    print(f"\nRunning {iterations} iterations for each model...")
    
    # 3. Yolo Benchmark
    t_start = time.time()
    for _ in range(iterations):
        yolo.detect(dummy_frame)
    yolo_fps = iterations / (time.time() - t_start)
    print(f"YOLOv11 Inference: {yolo_fps:.2f} FPS")
    
    # 4. Action Benchmark
    if action:
        t_start = time.time()
        for _ in range(iterations):
            action.predict(dummy_video_tensor)
        action_fps = iterations / (time.time() - t_start)
        print(f"Action Recognition (X3D): {action_fps:.2f} FPS")
    else:
        print("Action Recognition: Skipped")

    # 5. Audio Benchmark
    if audio:
        t_start = time.time()
        for _ in range(iterations):
            audio.predict(dummy_audio)
        audio_fps = iterations / (time.time() - t_start)
        print(f"Audio Analysis (YAMNet): {audio_fps:.2f} FPS")
    else:
        print("Audio Analysis: Skipped")
        
    print("\nBenchmark Complete.")
    print("To compare accuracy, please run 'python test_accuracy.py --dataset_path /path/to/sohas'")

if __name__ == "__main__":
    benchmark()
