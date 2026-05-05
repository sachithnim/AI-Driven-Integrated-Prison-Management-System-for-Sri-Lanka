import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
import csv

class AudioDetector:
    """
    Violent‑sound detector built on Google's YAMNet (AudioSet, 521 classes).

    Key accuracy techniques:
    1. Pre-emphasis filter          – boosts high‑freq content (screams, impacts)
    2. Peak normalisation           – uses full dynamic range regardless of mic gain
    3. Per-frame silence gating     – excludes quiet frames from scoring
    4. Top‑K frame scoring          – averages the K loudest frames instead of all
    5. Pre-computed violent mask    – avoids per‑call np.isin allocation
    """

    # ── Tunable constants ──────────────────────────────────────────────────
    SILENCE_DBFS         = -55      # global reject threshold (dBFS)
    FRAME_SILENCE_RMS    = 0.002    # per‑frame silence gate (~‑54 dBFS)
    PRE_EMPHASIS_COEFF   = 0.97     # standard pre‑emphasis coefficient
    TOP_K_FRAMES         = 3        # number of loudest frames to average
    VIOLENT_MEAN_BOOST   = 2.0      # multiplier on mean score for violent classes
    TOP_N_RESULTS        = 10       # results to return
    MIN_SCORE_THRESHOLD  = 0.04     # drop negligible detections from output
    YAMNET_HOP_SAMPLES   = 7680     # 0.48 s × 16 000 Hz

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
            'Boom', 'Fire alarm', 'Siren',
            'Emergency vehicle',
            # Glass / destruction
            'Glass', 'Crushing',
        }

        # Build a set of indices for fast lookup instead of string matching every time
        self.violent_indices = set()
        matched = set()
        for idx, name in enumerate(self.class_names):
            if name in self.violent_classes:
                self.violent_indices.add(idx)
                matched.add(name)

        # Warn about any class names that weren't found in YAMNet
        unmatched = self.violent_classes - matched
        if unmatched:
            print(f" AudioDetector: These violent class names were NOT found in YAMNet: {unmatched}")
        
        # Pre‑compute boolean mask (521,) — avoids np.isin allocation every predict()
        self.violent_mask = np.zeros(len(self.class_names), dtype=bool)
        for idx in self.violent_indices:
            self.violent_mask[idx] = True

        print(f"AudioDetector: Tracking {len(self.violent_indices)} violent sound classes out of {len(self.class_names)} total.")

    def _load_class_names(self, csv_path):
        class_names = []
        with open(csv_path) as csv_file:
            reader = csv.reader(csv_file)
            next(reader)  # Skip header
            for row in reader:
                class_names.append(row[2])
        return np.array(class_names)

    # ── Audio pre‑processing ──────────────────────────────────────────────

    def _preprocess(self, waveform):
        """
        Prepare raw mic audio for YAMNet:
        1. Pre‑emphasis  – amplifies high‑frequency energy (screams, impacts, glass)
        2. Peak normalisation – scales to [-1, 1] so quiet mics aren't penalised
        """
        # Pre-emphasis: y[n] = x[n] - α·x[n-1]
        emphasised = np.append(waveform[0], waveform[1:] - self.PRE_EMPHASIS_COEFF * waveform[:-1])

        # Peak normalisation — use full dynamic range
        peak = np.max(np.abs(emphasised))
        if peak > 1e-6:
            emphasised = emphasised / peak

        return emphasised.astype(np.float32)

    # ── Prediction ────────────────────────────────────────────────────────

    def predict(self, waveform):
        """
        Predict audio events from a waveform.
        waveform: 1D numpy array of float32, normalized to [-1, 1], sample rate 16kHz.
                  Can be 1-3 seconds (16000-48000 samples).
        Returns: tuple of (results_list, mean_embedding)
        
        Accuracy improvements over naive mean-pooling:
        1. Pre-emphasis filter boosts high-freq transients (screams, glass, gunshots)
        2. Peak normalisation handles varying mic gain levels
        3. Per-frame silence gating excludes quiet frames from scoring
        4. Top-K frame averaging — more robust than pure max, less diluted than full mean
        5. Expanded violent class coverage from AudioSet ontology
        """
        # Input validation
        if waveform.ndim != 1:
            waveform = waveform.flatten()
        if waveform.dtype != np.float32:
            waveform = waveform.astype(np.float32)
        if len(waveform) < 4800:  # <0.3s — YAMNet can't produce useful frames
            return [], np.zeros(1024, dtype=np.float32)

        # Global volume-based silence filter (quick reject)
        rms = np.sqrt(np.mean(waveform**2))
        dbfs = 20 * np.log10(rms + 1e-9)
        if dbfs < self.SILENCE_DBFS:
            # Near-silence, return no detection
            return [], np.zeros(1024, dtype=np.float32)

        # ── Pre-process ──
        processed = self._preprocess(waveform)

        # ── YAMNet inference ──
        scores, embeddings, spectrogram = self.model(processed)
        
        # scores shape: (num_frames, 521) — each frame is a ~0.48s window
        # embeddings shape: (num_frames, 1024)
        scores_np = scores.numpy() if hasattr(scores, 'numpy') else np.array(scores)
        embeddings_np = embeddings.numpy() if hasattr(embeddings, 'numpy') else np.array(embeddings)
        
        num_frames = scores_np.shape[0]
        
        if num_frames == 0:
            return [], np.zeros(1024, dtype=np.float32)

        # ── Per-frame silence gating ──
        # Exclude frames whose waveform segment is near-silent.
        # Prevents quiet padding from diluting scores of a brief violent event.
        hop = self.YAMNET_HOP_SAMPLES
        frame_rms = np.array([
            np.sqrt(np.mean(processed[i * hop : min((i + 1) * hop, len(processed))] ** 2))
            for i in range(num_frames)
        ])
        active_mask = frame_rms > self.FRAME_SILENCE_RMS

        if not active_mask.any():
            return [], np.zeros(1024, dtype=np.float32)

        active_scores = scores_np[active_mask]
        active_embeddings = embeddings_np[active_mask]
        n_active = active_scores.shape[0]

        # ── Hybrid Top-K + Max scoring ──
        # Pure max is noisy (one outlier frame dominates).
        # Pure mean is diluted (a single gunshot frame drowns in 5 quiet ones).
        # Top-K averaging balances both: average the K highest-scoring frames per class.
        k = min(self.TOP_K_FRAMES, n_active)

        if k >= 2:
            # For each of the 521 classes, pick the top-K frames and average their scores
            # np.partition is O(n) vs O(n log n) for full sort
            partitioned = np.partition(active_scores, -k, axis=0)[-k:]  # (K, 521)
            topk_mean = np.mean(partitioned, axis=0)                    # (521,)
        else:
            # When k=1, we want the max score across frames, not necessarily the chronologically first frame
            topk_mean = np.max(active_scores, axis=0)

        max_scores = np.max(active_scores, axis=0)    # (521,) — peak per class

        # For violent classes: use max(max_score, boosted top-K mean)
        # • Brief gunshot: max is high, top-K mean catches it via max()
        # • Sustained scream: top-K mean is high, boost ensures it ranks above noise
        combined_scores = np.where(
            self.violent_mask,  # Pre-computed boolean mask, no allocation
            np.maximum(max_scores, topk_mean * self.VIOLENT_MEAN_BOOST),
            topk_mean           # Non-violent classes use normal top-K mean
        )
        # Cap at 1.0
        combined_scores = np.minimum(combined_scores, 1.0)
        
        # Get top-N results
        top_n_indices = np.argsort(combined_scores)[::-1][:self.TOP_N_RESULTS]
        
        # Confidence-weighted embedding — weight each frame by its
        # max violent class score so the fusion model gets a signal
        # biased toward the "interesting" parts of the audio.
        violent_idx_list = list(self.violent_indices)
        if violent_idx_list:
            frame_weights = np.max(active_scores[:, violent_idx_list], axis=1)
            frame_weights = np.maximum(frame_weights, 0.01)  # avoid zero-division
            mean_embedding = np.average(active_embeddings, axis=0, weights=frame_weights)
        else:
            mean_embedding = np.mean(active_embeddings, axis=0)
        
        results = []
        for i in top_n_indices:
            score = float(combined_scores[i])
            if score < self.MIN_SCORE_THRESHOLD:
                continue  # Skip negligible detections
            
            label = self.class_names[i]
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
