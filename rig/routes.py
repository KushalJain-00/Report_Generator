from fastapi import FastAPI

app = FastAPI(title="RIG")


@app.get("/api/health")
async def health():
    return {"ok": True}
