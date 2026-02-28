FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required by scipy/numpy/sklearn
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
# Pin numpy<2 to ensure scipy/scikit-learn compatibility
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application source code
COPY app/ ./app/
COPY datasets/ ./datasets/

# Copy pre-trained models if they exist
COPY app/models/ ./app/models/

# Create models directory in case it's empty
RUN mkdir -p ./app/models

# Expose the rehabilitation service port
EXPOSE 8001

# Set working directory so relative imports in app/main.py work correctly
WORKDIR /app

# Start the FastAPI application
CMD ["python3", "app/main.py"]
