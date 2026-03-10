from ultralytics import YOLO
import cv2
import collections
import os
import numpy as np

# 1. Define the Mapping for face_emotion_classify.pt
EMOTION_CLASS_NAMES = ['Angry', 'Boring', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Stress', 'Suprise']

# Load Models
try:
    person_model = YOLO("yolo11n.pt")
    # To reduce output 
    print("YOLOv11n person model loaded successfully.")
    
    emotion_model = YOLO("app/models/face_emotion_classify.pt") 
    print("YOLO face_emotion_classify.pt emotion model loaded successfully.")
except Exception as e:
    print(f"Warning: YOLO models not found. Using placeholder. Error: {e}")
    person_model = None
    emotion_model = None

def analyze_video_emotions(video_path):
    """
    Analyzes a video clip using YOLO Detection -> Emotion Classification pipeline.
    """
    if not person_model or not emotion_model:
        return "Neutral", 0.0

    cap = cv2.VideoCapture(video_path)
    emotions_list = []
    
    frame_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1            
        
        # 1. Detect person
        person_results = person_model(frame, classes=[0], verbose=False) # class 0 is person
        
        for p_result in person_results:
            boxes = p_result.boxes
            if len(boxes) == 0:
                continue
                
            # Take the most confident person box
            best_box = max(boxes, key=lambda b: b.conf[0].item())
            x1, y1, x2, y2 = map(int, best_box.xyxy[0].tolist())
            
            # Crop frame
            person_crop = frame[max(0, y1):min(frame.shape[0], y2), max(0, x1):min(frame.shape[1], x2)]
            if person_crop.size == 0:
                continue
                
            # 2. Run emotion classification on crop
            e_results = emotion_model(person_crop, verbose=False)
            
            for e_res in e_results:
                if hasattr(e_res, 'probs') and e_res.probs is not None:
                    class_id = e_res.probs.top1
                    conf = e_res.probs.top1conf.item()
                    raw_label = emotion_model.names[class_id].capitalize()
                    
                    if raw_label in EMOTION_CLASS_NAMES:
                        print(f"Detected emotion: {raw_label} with confidence {conf}")
                        emotions_list.append((raw_label, conf))
    cap.release()

    if not emotions_list:
        return "Neutral", 0.0

    # Get most common emotion
    emotion_counts = collections.Counter([e[0] for e in emotions_list])
    if not emotion_counts:
        return "Neutral", 0.0
        
    dominant_emotion = emotion_counts.most_common(1)[0][0]
    
    # Calculate average confidence
    total_conf = sum([e[1] for e in emotions_list if e[0] == dominant_emotion])
    count = emotion_counts[dominant_emotion]
    avg_conf = total_conf / count if count > 0 else 0.0
    
    return dominant_emotion, avg_conf

def analyze_image_emotions(image_path):
    """
    Analyzes a single image using YOLO Detection -> Emotion Classification pipeline.
    """
    if not person_model or not emotion_model:
        return "No Model", 0.0

    frame = cv2.imread(image_path)
    if frame is None:
        return "No Frame", 0.0

    person_results = person_model(frame, classes=[0], verbose=False)
    for p_result in person_results:
        boxes = p_result.boxes
        if len(boxes) == 0:
            continue
            
        best_box = max(boxes, key=lambda b: b.conf[0].item())
        x1, y1, x2, y2 = map(int, best_box.xyxy[0].tolist())
        
        person_crop = frame[max(0, y1):min(frame.shape[0], y2), max(0, x1):min(frame.shape[1], x2)]
        if person_crop.size == 0:
            continue
            
        e_results = emotion_model(person_crop, verbose=False)
        for e_res in e_results:
            if hasattr(e_res, 'probs') and e_res.probs is not None:
                class_id = e_res.probs.top1
                conf = e_res.probs.top1conf.item()
                raw_label = emotion_model.names[class_id].capitalize()
                
                if raw_label in EMOTION_CLASS_NAMES:
                    return raw_label, float(conf)
                    
    return "Neutral", 0.0