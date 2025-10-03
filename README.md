# 🎥 Interview Online

An online interview platform with **real-time video conferencing**, **authentication**, **speech-to-text transcription**, and **AI-powered summaries**.  
Built with **React (frontend)** + **FastAPI (backend)** + **LiveKit (real-time media)**.

---

## 🚀 Features
- 🔑 Authentication (Admin & User roles)  
- 🏠 Admin dashboard: create & manage rooms  
- 🎥 Real-time video & audio (LiveKit)  
- 📡 Screen sharing & media controls  
- 📝 Transcription + AI-generated summaries  
- 📊 Room and user management with database  

---

## 📂 Project Structure

```

interview_online/
│── client/   # React frontend (docs inside client/README.md)
│── server/   # FastAPI backend (docs inside server/README.md)
│── README.md # Main documentation

````

👉 For details:  
- [Frontend Documentation](./client/README.md)  
- [Backend Documentation](./server/README.md)  

---

## ⚙️ Installation

### Backend
```bash
cd server
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
````

Create `.env` in `server/`:

```
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
DATABASE_URL=sqlite+aiosqlite:///./app.db
```

### Frontend

```bash
cd client
npm install
npm run dev
```

Then open: `http://localhost:5173`

---

## 🏗️ Architecture

* **Frontend (React, Tailwind, shadcn/ui)** → UI & media controls
* **Backend (FastAPI, SQLAlchemy, LiveKit API)** → Auth, room management, transcription
* **Database (SQLite/Postgres)** → Users, rooms, transcripts
* **AI Services** → Whisper (speech-to-text), LLM for summaries

---

## 📡 API Endpoints

| Endpoint             | Method | Description       |
| -------------------- | ------ | ----------------- |
| `/api/auth/login`    | POST   | User login        |
| `/api/auth/register` | POST   | User signup       |
| `/api/rooms`         | GET    | List rooms        |
| `/api/admin/room`    | POST   | Create room       |
| `/api/join-room`     | POST   | Join room         |
| `/api/token`         | POST   | Get LiveKit token |

---

## 👋 Notes for the Next Developer

### 🔹 LiveKit setup

For better performance, deploy LiveKit locally. Docs: [LiveKit Docs](https://docs.livekit.io/)

Quick start (Docker):

```bash
docker run --rm -it \
  -p 7880:7880 -p 7881:7881 \
  -e LIVEKIT_KEYS=testkey:testsecret \
  livekit/livekit-server \
  --dev --bind 0.0.0.0
```

`.env` config:

```
LIVEKIT_URL=http://localhost:7880
LIVEKIT_API_KEY=testkey
LIVEKIT_API_SECRET=testsecret
```


---
## 🤖 AI Features

### 🔊 Speech-to-Text (ASR)
We use HuggingFace’s pretrained model:  
[`indonesian-nlp/wav2vec2-large-xlsr-indonesian`](https://huggingface.co/indonesian-nlp/wav2vec2-large-xlsr-indonesian)  

- Converts Indonesian audio into text in real-time.  
- Integrated with the meeting transcription service (`services/transcription_bot.py`).  
- Can be swapped with other ASR models if needed.  

---

### 📝 Summarization & LLM
We use a custom LLM service hosted at:  
```

[http://pe.spil.co.id/kobold/v1/chat/completions](http://pe.spil.co.id/kobold/v1/chat/completions)

```

- Takes transcripts as input.  
- Generates **summaries** of meeting conversations.  
- Designed to integrate with the backend’s `services/llm_service.py`.  

API reference: [KoboldCpp API docs](https://lite.koboldai.net/koboldcpp_api#/v1/post_v1_audio_transcriptions)

---

### ⚡ Flow
1. Audio from LiveKit → ASR model (wav2vec2 Indonesian).  
2. Transcripts saved to DB.  
3. LLM API generates summaries → displayed in frontend.  

---

## 📂 Project Structure
```

interview_online/
│── client/   # React frontend
│── server/   # FastAPI backend
│   └── services/
│       ├── transcription_bot.py   # Speech-to-Text integration
│       └── llm_service.py         # LLM summarization integration
│── README.md

```
---

### 🔹 Demo

If you want to test joining without setting up backend/AI:

* Open: [https://mini-gmeet-frontend.vercel.app/](https://mini-gmeet-frontend.vercel.app/)
* Go to: [https://mini-gmeet-frontend.vercel.app/room](https://mini-gmeet-frontend.vercel.app/room)
* Create a room and share the link with a friend

⚠️ Limitations of demo:

* ❌ No password/room ID checks
* ❌ No AI features
* ✅ Just quick video/audio join

---

### 🔹 Common Issues

1. **Connection failed / can’t join**

   * LiveKit URL mismatch between frontend & backend
   * CORS/mixed `http` vs `https`
   * Wrong room/auth parameters
   * Firewall/VPN blocking UDP
   * Token expired (check system clock)

2. **Token OK, but no audio/video**

   * Browser permissions denied
   * Another app locking the camera/mic
   * Too high capture constraints (try 720p or 540p)


