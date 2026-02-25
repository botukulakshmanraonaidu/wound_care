#!/usr/bin/env bash
# =============================================================
# Render Build Script — Django REST API
# Run by Render on every deployment before starting the server.
# =============================================================

set -o errexit   # Exit immediately if any command fails

echo "--- Installing Python dependencies ---"
pip install --upgrade pip
pip install -r requirements.txt

echo "--- Collecting static files ---"
python manage.py collectstatic --no-input

echo "--- Applying database migrations ---"
python manage.py migrate

echo "--- Build complete ---"
