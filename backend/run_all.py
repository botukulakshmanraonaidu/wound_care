import subprocess
import sys
import os
import time
import signal

def run():
    # Get absolute paths to subdirectories
    base_dir = os.path.abspath(os.path.dirname(__file__))
    django_dir = os.path.join(base_dir, "Ai_wound")
    ml_dir = os.path.join(base_dir, "ml_service")
    
    print("🚀 Starting AI MediWound Services...")

    # 1. Start ML Service (FastAPI)
    print("🤖 Starting ML Service (FastAPI) on port 8001...")
    ml_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"],
        cwd=ml_dir
    )
    
    # Wait a bit for ML service to initialize
    time.sleep(2)
    
    # 2. Start Django Backend
    print("🌐 Starting Django Backend on port 8000...")
    django_proc = subprocess.Popen(
        [sys.executable, "manage.py", "runserver", "0.0.0.0:8000"],
        cwd=django_dir
    )
    
    def signal_handler(sig, frame):
        print("\n🛑 Shutting down services...")
        ml_proc.terminate()
        django_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    
    print("\n✅ Both services are running. Press Ctrl+C to stop.")
    
    try:
        # Keep the main process alive until interrupted
        while True:
            time.sleep(1)
            if ml_proc.poll() is not None:
                print("⚠️  ML Service has stopped.")
                break
            if django_proc.poll() is not None:
                print("⚠️  Django Backend has stopped.")
                break
    except KeyboardInterrupt:
        pass
    finally:
        ml_proc.terminate()
        django_proc.terminate()
        print("💀 Services stopped.")

if __name__ == "__main__":
    run()
