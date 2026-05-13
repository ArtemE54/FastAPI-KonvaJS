from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse


app = FastAPI()

scene_storage = None
@app.post("/api/save")
async def save_scene(request: Request):
    global scene_storage
    scene_storage = await request.json()
    return {"status": "ok"}
@app.get("/api/load")
async def load_scene():
    if scene_storage is None:
        return JSONResponse(content={"error": "Нет сцены"})
    return scene_storage
app.mount("/", StaticFiles(directory="static", html=True), name="static")

#uvicorn main:app --reload