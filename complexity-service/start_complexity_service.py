#!/usr/bin/env python3
"""
Startup script for Complexity Prediction Service
Port: 5002 (séparé du service ML existant sur port 5050)
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    print("🚀 Starting Complexity Prediction Service (Port 5002)...")
    print(f"📍 Working Directory: {os.getcwd()}")
    
    # Check if model file exists
    model_path = Path("complexity_classifier.pkl")
    if not model_path.exists():
        print(f"❌ Model file not found: {model_path}")
        print("Please ensure complexity_classifier.pkl is in the current directory")
        sys.exit(1)
    
    print(f"✅ Model file found: {model_path}")
    
    # Check if requirements are installed
    try:
        import flask
        import flask_cors
        import numpy
        import pandas
        import sklearn
        import joblib
        print("✅ All dependencies are available")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        sys.exit(1)
    
    # Start service
    try:
        print("🌟 Starting Flask app on port 5002...")
        subprocess.run([sys.executable, "app.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start service: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Complexity service stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()
