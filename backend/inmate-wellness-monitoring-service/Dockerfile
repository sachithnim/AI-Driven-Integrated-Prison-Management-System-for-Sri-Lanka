# Use official modern Python runtime
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for OpenCV and audio processing
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --default-timeout=100 --no-cache-dir -r requirements.txt librosa

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 5010

# Command to run the application
CMD ["python", "run.py"]
