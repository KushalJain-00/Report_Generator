"""RIG — Report Intelligence Generator. Run: python app.py"""
import uvicorn

from rig.routes import app

if __name__ == "__main__":
    print("\n  RIG — http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
