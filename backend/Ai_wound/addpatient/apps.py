import subprocess
import sys
import threading
import os
from django.apps import AppConfig


class AddpatientConfig(AppConfig):
    name = 'addpatient'

    def ready(self):
        # Avoid double-launching during Django's auto-reloader:
        # The reloader runs the app twice; RUN_MAIN is set only in the actual worker process.
        if os.environ.get('RUN_MAIN') != 'true':
            return

        def start_ml_service():
            # Determine the Python executable from the current virtual environment
            venv_python = os.path.join(
                os.path.dirname(sys.executable),
                'python.exe' if sys.platform == 'win32' else 'python'
            )

            # Resolve the backend root (two levels up from this apps.py → addpatient → Ai_wound → backend)
            # This is where Ai_wound and ml_service now coexist
            backend_root = os.path.abspath(
                os.path.join(os.path.dirname(__file__), '..', '..')
            )

            print(f"[ML Service] Auto-starting FastAPI on port 8001...")
            print(f"[ML Service] Using Python: {venv_python}")
            print(f"[ML Service] Working dir: {backend_root}")

            try:
                subprocess.Popen(
                    [
                        venv_python, "-m", "uvicorn",
                        "ml_service.main:app",
                        "--host", "0.0.0.0",
                        "--port", "8001",
                        "--reload"
                    ],
                    cwd=backend_root,
                    # Inherit stdout/stderr so ML logs appear in the same terminal
                    stdout=None,
                    stderr=None,
                )
                print("[ML Service] FastAPI ML service launched successfully.")
            except Exception as e:
                print(f"[ML Service] Failed to start: {e}")

        # Run in a daemon thread so it doesn't block Django startup
        thread = threading.Thread(target=start_ml_service, daemon=True)
        thread.start()
