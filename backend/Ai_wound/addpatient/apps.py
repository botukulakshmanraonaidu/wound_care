import subprocess
import sys
import threading
import os
from django.apps import AppConfig


class AddpatientConfig(AppConfig):
    name = 'addpatient'

    def ready(self):
        # Auto-launch the Flask ML service alongside Django
        if os.environ.get('RUN_MAIN') != 'true':
            return

        def start_ml_service():
            venv_python = os.path.join(
                os.path.dirname(sys.executable),
                'python.exe' if sys.platform == 'win32' else 'python'
            )
            
            # Resolve the backend root (where ml_services and Ai_wound co-exist)
            backend_root = os.path.abspath(
                os.path.join(os.path.dirname(__file__), '..', '..')
            )
            ml_dir = os.path.join(backend_root, "ml_services")
            
            print(f"[ML Service] Auto-starting Flask on port 8001...")
            
            env = os.environ.copy()
            env["PORT"] = "8001"
            
            try:
                subprocess.Popen(
                    [venv_python, "ai_api.py"],
                    cwd=ml_dir,
                    env=env
                )
                print("[ML Service] Flask ML service launched successfully.")
            except Exception as e:
                print(f"[ML Service] Failed to auto-start: {e}")

        # Start in a background thread to avoid blocking Django
        threading.Thread(target=start_ml_service, daemon=True).start()
