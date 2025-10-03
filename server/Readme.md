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


## 🤖 AI Integrations

### 🔊 Speech-to-Text (ASR)
- Model: [wav2vec2-large-xlsr-indonesian](https://huggingface.co/indonesian-nlp/wav2vec2-large-xlsr-indonesian)  
- Used for transcription during meetings.  
- Runs inside `services/transcription_bot.py`.

### 📝 LLM Summarization
- Endpoint: `http://pe.spil.co.id/kobold/v1/chat/completions`  
- API Docs: [KoboldCpp API](https://lite.koboldai.net/koboldcpp_api#/v1/post_v1_audio_transcriptions)  
- Service implementation: `services/llm_service.py`.  
- Generates **summaries** from full transcripts.  




---
## 🛠️ Tech Stack

* FastAPI
* SQLAlchemy (async)
* LiveKit API
* Whisper + LLM API
* PostgreSQL
