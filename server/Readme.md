# ⚡ Backend (Server)

This is the **FastAPI backend** for Interview Online.  
It handles authentication, room management, transcription, and LiveKit token issuance.

---

## 🚀 Features
- FastAPI + SQLAlchemy  
- JWT-based authentication  
- Role-based access (Admin/User)  
- LiveKit API integration  
- Whisper + LLM for transcription & summaries  
- Async database operations  

---

## ⚙️ Setup
```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
````

---

## 📂 Structure

```
server/
│── main.py                # Entry point
│── routes/                # API endpoints
│── auth/                  # Authentication
│── database/              # DB models & connection
│── services/              # LiveKit, transcription, LLM
│── config/                # Config & env handling
```

---

## 📡 API Endpoints

| Endpoint             | Method | Description         |
| -------------------- | ------ | ------------------- |
| `/api/auth/login`    | POST   | User login          |
| `/api/auth/register` | POST   | User signup         |
| `/api/rooms`         | GET    | List rooms          |
| `/api/admin/room`    | POST   | Create room         |
| `/api/join-room`     | POST   | Join room           |
| `/api/token`         | POST   | Issue LiveKit token |

---

## .env.example

```bash
LIVEKIT_API_URL=XXXXXXXXXXXXXXXXXXXXXXXXXX
LIVEKIT_WS_URL=XXXXXXXXXXXXXXXXXXXXXXXXXX
LIVEKIT_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXX
LIVEKIT_API_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXX

JWT_SECRET_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXX
DATABASE_URL=XXXXXXXXXXXXXXXXXXXXXXXXXX
````

---

## 🛠️ Tech Stack

* FastAPI
* SQLAlchemy (async)
* LiveKit API
* Whisper + LLM API
* PostgreSQL
