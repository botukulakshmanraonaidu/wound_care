# Use an official lightweight Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 5000
# Prevent matplotlib from trying to open a display on headless servers
ENV MPLBACKEND Agg

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the AI module code
COPY . .

# Expose the port
EXPOSE 5000

# Start the application using gunicorn
# --timeout 300  : Allows slow cold-starts (TF model loading) without worker kill
# --workers 1    : Single worker to avoid loading the model in multiple processes
# --preload      : Load app (and models) before forking workers — faster first request
CMD gunicorn --workers 1 --timeout 300 --preload --bind 0.0.0.0:$PORT ai_api:app
