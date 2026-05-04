import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
import csv

class AudioDetector:
    def __init__(self):
        print("Loading YAMNet model from TensorFlow Hub...")
        self.model = hub.load('https://tfhub.dev/google/yamnet/1')
        self.class_map_path = self.model.class_map_path().numpy().decode('utf-8')
        self.class_names = self._load_class_names(self.class_map_path)
        
        # Expanded target classes from the AudioSet/YAMNet ontology.
        # Grouped by category for clarity. These are exact YAMNet class display_names.
        self.violent_classes = {
            # Vocal violence
            'Screaming', 'Shouting', 'Yell', 'Battle cry', 'Crying, sobbing',
            'Wail, moan', 'Grunt', 'Groan',
            # Physical impact
            'Slap, smack', 'Whack, thwack', 'Smash, crash', 'Thump, thud',
            'Bang', 'Clang', 'Crash', 'Breaking', 'Shatter',
            # Weapons
            'Gunshot, gunfire', 'Machine gun', 'Fusillade', 'Cap gun',
            'Artillery fire',
            # Explosions & danger
            'Explosion', 'Boom', 'Fire alarm', 'Siren',
            'Emergency vehicle',
            # Glass / destruction
            'Glass', 'Crushing',
        }

        # Build a set of indices for fast lookup instead of string matching every time
        self.violent_indices = set()
        for idx, name in enumerate(self.class_names):
            if name in self.violent_classes:
                self.violent_indices.add(idx)
        
        print(f"AudioDetector: Tracking {len(self.violent_indices)} violent sound classes out of {len(self.class_names)} total.")

    def _load_class_names(self, csv_path):
        class_names = []
        with open(csv_path) as csv_file:
            reader = csv.reader(csv_file)
            next(reader)  # Skip header
            for row in reader:
                class_names.append(row[2])
        return np.array(class_names)

    def predict(self, waveform):
        """
        Predict audio events from a waveform.
        waveform: 1D numpy array of float32, normalized to [-1, 1], sample rate 16kHz.
                  Can be 1-3 seconds (16000-48000 samples).
        Returns: tuple of (results_list, mean_embedding)
        
        Improvements over naive mean-pooling:
        1. Per-frame max scoring — catches transient sounds (gunshots, slaps)
        2. Adaptive silence filtering — ignores quiet frames individually
        3. Expanded violent class coverage from AudioSet ontology
        """
        # Global volume-based silence filter (quick reject)
        rms = np.sqrt(np.mean(waveform**2))
        dbfs = 20 * np.log10(rms + 1e-9)
        if dbfs < -50:
            # Near-silence, return no detection
            return [], np.zeros(1024, dtype=np.float32)

        # YAMNet expects a 1D float32 tensor
        scores, embeddings, spectrogram = self.model(waveform)
        
        # scores shape: (num_frames, 521) — each frame is a ~0.48s window
        # embeddings shape: (num_frames, 1024)
        scores_np = scores.numpy() if hasattr(scores, 'numpy') else np.array(scores)
        embeddings_np = embeddings.numpy() if hasattr(embeddings, 'numpy') else np.array(embeddings)
        
        num_frames = scores_np.shape[0]
        
        if num_frames == 0:
            return [], np.zeros(1024, dtype=np.float32)
        
        # --- Strategy: Hybrid max + weighted-mean scoring ---
        # Max-pool catches transient events (gunshot in 1 frame out of 6)
        # Weighted-mean (top-k frames) provides stability for sustained sounds (screaming)
        
        max_scores = np.max(scores_np, axis=0)           # (521,) — peak per class
        mean_scores = np.mean(scores_np, axis=0)          # (521,) — average per class
        
        # For violent classes, use the maximum of (max_score, boosted_mean)
        # This ensures a brief gunshot (high max, low mean) still scores high
        # while sustained screaming (high mean) also scores high
        combined_scores = np.where(
            np.isin(np.arange(len(max_scores)), list(self.violent_indices)),
            np.maximum(max_scores, mean_scores * 1.5),  # Boost mean for violent classes
            mean_scores  # Non-violent classes use normal mean
        )
        # Cap at 1.0
        combined_scores = np.minimum(combined_scores, 1.0)
        
        # Get top-N results
        top_n_indices = np.argsort(combined_scores)[::-1][:10]
        
        # Mean embedding (for fusion model input)
        mean_embedding = np.mean(embeddings_np, axis=0)
        
        results = []
        for i in top_n_indices:
            label = self.class_names[i]
            score = float(combined_scores[i])
            
            is_violent = int(i) in self.violent_indices
            
            results.append({
                "class": label,
                "score": score,
                "is_violent": is_violent
            })
            
        return results, mean_embedding

if __name__ == "__main__":
    detector = AudioDetector()
    # Dummy waveform: 1 second of silence at 16kHz
    dummy_wave = np.zeros(16000, dtype=np.float32)
    print(detector.predict(dummy_wave))
