from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import os

app = FastAPI(title="QCM IEC 62443", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")

QUESTIONS_DIR = "questions"


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/api/chapitres")
async def get_chapitres():
    chapitres = []
    if not os.path.exists(QUESTIONS_DIR):
        return {"chapitres": []}
    for filename in sorted(os.listdir(QUESTIONS_DIR)):
        if filename.endswith(".json"):
            filepath = os.path.join(QUESTIONS_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            chapitres.append({
                "id": filename.replace(".json", ""),
                "titre": data.get("titre", filename),
                "description": data.get("description", ""),
                "nb_questions": len(data.get("questions", []))
            })
    return {"chapitres": chapitres}


@app.get("/api/chapitres/{chapitre_id}")
async def get_chapitre(chapitre_id: str):
    filepath = os.path.join(QUESTIONS_DIR, f"{chapitre_id}.json")
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Chapitre introuvable")
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data
