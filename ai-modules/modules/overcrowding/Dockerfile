FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required by torch/scipy/numpy/PIL
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    libgomp1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install only the overcrowding module requirements
COPY modules/overcrowding/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the DETR model at build time so the container starts instantly
# and doesn't fail due to network issues at runtime
RUN python3 -c 'from transformers import pipeline; print("Downloading facebook/detr-resnet-50 model..."); pipeline("object-detection", model="facebook/detr-resnet-50"); print("Model downloaded and cached successfully.")'

# Copy the modules package (preserves package structure for relative imports)
COPY modules/ ./modules/

# Expose overcrowding service port
EXPOSE 8002

# Change into the overcrowding directory so `python3 run.py` works directly
WORKDIR /app/modules/overcrowding

CMD ["python3", "run.py"]
