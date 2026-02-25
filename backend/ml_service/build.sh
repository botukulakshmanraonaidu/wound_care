#!/usr/bin/env bash
# =============================================================
# Render Build Script — FastAPI ML Service
# Run by Render on every deployment before starting the server.
# =============================================================

set -o errexit   # Exit immediately if any command fails

echo "--- Installing Python dependencies ---"
pip install --upgrade pip
pip install -r requirements.txt

echo "--- Build complete ---"
