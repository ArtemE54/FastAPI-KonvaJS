from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
import sqlite3
import json
import os
from typing import Optional

app = FastAPI()

DB_NAME = "database.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ugo_objects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name_ugo TEXT NOT NULL,
            version_ugo_editor INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            svg TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.post("/api/save")
async def save_scene(request: Request):
    data = await request.json()
    if not data.get("name"):
        raise HTTPException(400, "Поле 'name' обязательно")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(version_ugo_editor) as max_version FROM ugo_objects WHERE name_ugo = ?", (data["name"],))
    row = cursor.fetchone()
    new_version = (row["max_version"] or 0) + 1
    cursor.execute(
        "INSERT INTO ugo_objects (name_ugo, version_ugo_editor, data_json, svg) VALUES (?, ?, ?, ?)",
        (data["name"], new_version, json.dumps(data.get("data_json", {})), data.get("svg", ""))
    )
    conn.commit()
    conn.close()
    return {"status": "ok", "name": data["name"], "version": new_version}

@app.get("/api/load")
async def load_scene(name: Optional[str] = None, version: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if name is None:
        cursor.execute("SELECT DISTINCT name_ugo, MAX(version_ugo_editor) as latest_version FROM ugo_objects GROUP BY name_ugo")
        scenes = [{"name": row["name_ugo"], "latest_version": row["latest_version"]} for row in cursor.fetchall()]
        conn.close()
        return {"scenes": scenes}
    if version is None:
        cursor.execute("SELECT * FROM ugo_objects WHERE name_ugo = ? ORDER BY version_ugo_editor DESC LIMIT 1", (name,))
    else:
        cursor.execute("SELECT * FROM ugo_objects WHERE name_ugo = ? AND version_ugo_editor = ?", (name, version))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Сцена не найдена")
    return {
        "id": row["id"], "name": row["name_ugo"], "version": row["version_ugo_editor"],
        "data_json": json.loads(row["data_json"]), "svg": row["svg"] or ""
    }

@app.get("/")
async def index():
    return FileResponse("static/index.html", media_type="text/html")

@app.get("/style.css")
async def css():
    return FileResponse("static/style.css", media_type="text/css")

@app.get("/js/{filename}")
async def js_files(filename: str):
    file_path = f"static/js/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(404, f"File {filename} not found")
    return FileResponse(file_path, media_type="application/javascript")
