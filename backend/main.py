from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
from pathlib import Path
from fastapi import UploadFile, Form, File, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
import tempfile
import shutil
import secrets
from filter_cv.spil_llm import get_optimized_keywords, chatbot
from filter_cv.algorithm import rank_cvs_hybrid, progress_store, calculate_scores, run_pipeline

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms: Dict[str, List[WebSocket]] = {}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    if room_id not in rooms:
        rooms[room_id] = []
    rooms[room_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            for ws in rooms[room_id]:
                if ws != websocket:
                    await ws.send_text(data)
    except:
        rooms[room_id].remove(websocket)


@app.post("/rank-cvs")
async def rank_cvs_endpoint(job_desc: str = Form(...)):
    try:
        optimized_keywords = await get_optimized_keywords(job_desc)
        df, kw_list, hits = rank_cvs_hybrid(Path("data_cv/"), optimized_keywords, job_desc)
        full_rank = df[["file", "final_score", "tfidf_score", "embed_score", "keywords_for_tfidf"]].to_dict(orient="records")
        return JSONResponse({
            "rank": full_rank, "keywords": kw_list, "edges": hits
        })    
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/optimize-keywords")
async def optimize_keywords(description: str = Form(...)):
    try:
        optimized = await get_optimized_keywords(description)
        return JSONResponse(content={"optimized_keywords": optimized})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/start-job")
async def start_job(
    background_tasks: BackgroundTasks,
    zip_file: UploadFile = File(...),
    job_desc: str = Form(...),
    manual_keywords: str = Form(None)
):
    task_id = secrets.token_hex(8)
    progress_store[task_id] = {"pct": 0, "stage": "upload"}

    tmp_path = Path(tempfile.mkdtemp()) / "cv.zip"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(zip_file.file, f)

    optimized_keywords = await get_optimized_keywords(job_desc)
    if manual_keywords and manual_keywords.strip():
        combined_keywords = manual_keywords.strip().rstrip(",") + ", " + optimized_keywords
    else:
        combined_keywords = optimized_keywords
    
    background_tasks.add_task(run_pipeline, task_id, tmp_path, combined_keywords, job_desc)
    return {"task_id": task_id}


@app.post("/rerank")
async def rerank(request: Request):
    data = await request.json()
    task_id = data.get("task_id")
    new_keywords = data.get("new_keywords")

    if not task_id or not new_keywords or task_id not in progress_store:
        return JSONResponse({"error": "Data tidak valid"}, status_code=400)

    original_texts_dict = progress_store[task_id]["result"]["texts"]
    original_job_desc = progress_store[task_id]["result"].get("job_description", "")
    pdf_names = list(original_texts_dict.keys())
    texts = list(original_texts_dict.values())

    df, kw, hits = calculate_scores(texts, pdf_names, new_keywords, original_job_desc)
    
    new_result = {
        "rank": df.drop(columns=["full_text"]).to_dict(orient="records"),
        "texts": original_texts_dict, 
        "keywords": kw,
        "edges": hits,
        "optimized_keywords": new_keywords
    }
    
    return JSONResponse(new_result)

@app.get("/progress/{task_id}")
def get_progress(task_id: str):
    return progress_store.get(task_id, {"pct": 0, "stage": "unknown"})

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    question = data.get("question", "")
    cv_data = data.get("cv_data", [])
    cv_texts = data.get("cv_texts", {})
    keywords = data.get("keywords", "")
    job_description = data.get("job_description", "")
    
    try:
        response = await chatbot(question, cv_data, cv_texts, keywords, job_description)
        return response
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)