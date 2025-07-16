from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List

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
