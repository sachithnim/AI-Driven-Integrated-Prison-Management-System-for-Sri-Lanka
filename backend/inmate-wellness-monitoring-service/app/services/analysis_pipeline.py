from transformers import pipeline, AutoConfig, Wav2Vec2ForSequenceClassification, Wav2Vec2FeatureExtractor
import torch
import librosa
import torch.quantization
import cv2
import requests
import json
import base64
import os
from .emotion_service import analyze_image_emotions

# 1. Initialize HuggingFace/PyTorch Models (Lazy Load to save startup time)
_gender_pipe = None
_voice_model = None
_voice_feature_extractor = None

def get_gender_pipeline():
    global _gender_pipe
    if _gender_pipe is None:
        print("Loading Realistic-Gender-Classification model...")
        _gender_pipe = pipeline("image-classification", model="prithivMLmods/Realistic-Gender-Classification")
    return _gender_pipe

def get_voice_model():
    global _voice_model, _voice_feature_extractor
    if _voice_model is None:
        print("Loading Quantized Voice Emotion Classification model...")
        try:
            model_dir = os.path.join(os.path.dirname(__file__), '..', 'models', 'best_wav2vec_model')
            weights_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'quantized_emotion_model.pth')
            
            config = AutoConfig.from_pretrained(model_dir)
            _voice_feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_dir)
            
            model = Wav2Vec2ForSequenceClassification(config)
            model = torch.quantization.quantize_dynamic(
                model, {torch.nn.Linear}, dtype=torch.qint8
            )
            model.load_state_dict(torch.load(weights_path, map_location='cpu'))
            model.eval()
            _voice_model = model
            print("Successfully loaded quantized_emotion_model.")
        except Exception as e:
            print(f"Failed to load Voice Model: {e}")
            raise e
    return _voice_model, _voice_feature_extractor

# 2. Gender from Initial Image
def analyze_gender(image_path):
    pipe = get_gender_pipeline()
    try:
        results = pipe(image_path)
        if results:
            # e.g., [{'label': 'male', 'score': 0.99}, ...]
            best = max(results, key=lambda x: x['score'])
            return best['label'], float(best['score'])
    except Exception as e:
        print(f"Gender analysis error: {e}")
    return "Unknown", 0.0

# 3. OCR using glm-ocr:latest via local Ollama
def extract_prescription_ocr(image_path):
    # Convert image to base64
    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    
    # Connect to Ollama (respecting Docker configurations if present)
    base_url = os.getenv("LLM_BASE_URL", "http://localhost:11434")
    # Clean up any trailing /v1 if reused from OpenAI-style configs
    if base_url.endswith("/v1"):
        base_url = base_url[:-3]
    
    url = f"{base_url}/api/generate"
    
    payload = {
        "model": "glm-ocr:latest",
        "prompt": "Extract all the text from this medical prescription. Output only the extracted text.",
        "stream": False,
        "images": [base64_image]
    }
    
    try:
        print("Calling Ollama glm-ocr:latest...")
        response = requests.post(url, json=payload, timeout=60)
        if response.status_code == 200:
            result = response.json()
            return result.get('response', '')
        else:
            print(f"Ollama OCR Error: {response.text}")
            return "Failed to extract text using OCR."
    except Exception as e:
        print(f"OCR Connection Error: {e}")
        return "Failed to connect to local Ollama instance for OCR."

# 4. Voice emotion analysis from recorded answer audio
def analyze_voice_emotion(audio_path):
    try:
        model, feature_extractor = get_voice_model()
        speech, sr = librosa.load(audio_path, sr=16000)
        
        inputs = feature_extractor(speech, sampling_rate=16000, return_tensors="pt", padding=True)
        
        with torch.no_grad():
            logits = model(**inputs).logits
            
        pred_id = torch.argmax(logits, dim=-1).item()
        confidence = torch.nn.functional.softmax(logits, dim=-1).max().item()
        
        config = model.config
        label = config.id2label[pred_id]
        
        return label, float(confidence)
    except Exception as e:
        print(f"Voice emotion error: {e}")
    return "neutral", 0.0

# 5. Reusing YOLO Emotion Model for Single Image
def analyze_image_emotion(image_path):
    return analyze_image_emotions(image_path)
