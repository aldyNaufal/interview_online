# 🎥 Interview Online

An online interview platform with **real-time video conferencing**, **authentication**, **speech-to-text transcription**, and **AI-powered summaries**.  
Built with **React (frontend)** + **FastAPI (backend)** + **LiveKit (real-time media)**.

---

## 🚀 Features
- 🔑 Authentication (Admin & User roles)  
- 🏠 Admin dashboard: create & manage rooms  
- 🎥 Real-time video & audio (LiveKit)  
- 📡 Screen sharing & media controls  
- 📝 Speech-to-Text (Indonesian) + AI summaries  
- 📊 Room and user management with database  

---

## 📂 Project Structure
```

interview_online/
│── client/       # React frontend
│── server/       # FastAPI backend
│   ├── auth/
│   ├── config/
│   ├── database/
│   ├── routes/
│   ├── services/ # LiveKit, ASR, LLM services
│   ├── scripts/  # Utility scripts (admin creation, AI tests)
│   │   ├── create_admin.py  # Script to create an Admin user
│   │   └── test_asr.py      # Script to test ASR transcription
│   └── main.py
│── README.md

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

`.env` file inside `server/`:

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

## 🤖 AI Features

### 🔊 Speech-to-Text (ASR)

* Model: [wav2vec2-large-xlsr-indonesian](https://huggingface.co/indonesian-nlp/wav2vec2-large-xlsr-indonesian)
* Converts Indonesian audio into text.
* Integrated via `services/transcription_bot.py`.
* Test it directly:

  ```bash
  cd server/scripts
  python test_asr.py
  ```

---

### 📝 Summarization & LLM

* Endpoint: `http://pe.spil.co.id/kobold/v1/chat/completions`
* API Docs: [KoboldCpp API](https://lite.koboldai.net/koboldcpp_api#/v1/post_v1_audio_transcriptions)
* Implemented in `services/llm_service.py`.
* Used to summarize full meeting transcripts into structured notes.

---

### ⚡ Flow

1. Audio → ASR (wav2vec2 Indonesian).
2. Transcript stored in DB.
3. LLM API → generates summary → displayed in frontend.

---

## 🧑‍💻 Admin & Scripts

* **Create Admin User**

  ```bash
  cd server/scripts
  python create_admin.py
  ```

  This lets you bootstrap the system with your first admin account.

* **Test ASR Model**

  ```bash
  cd server/scripts
  python test_asr.py
  ```

  Runs a quick check of the Indonesian speech-to-text pipeline.

---

## 👋 Notes for the Next Developer

### 🔹 LiveKit

For better performance, run LiveKit locally. Docs: [LiveKit Docs](https://docs.livekit.io/)

Quick start:

```bash
docker run --rm -it \
  -p 7880:7880 -p 7881:7881 \
  -e LIVEKIT_KEYS=testkey:testsecret \
  livekit/livekit-server \
  --dev --bind 0.0.0.0
```

---

### 🔹 Demo (no AI, no auth)

* [https://mini-gmeet-frontend.vercel.app/](https://mini-gmeet-frontend.vercel.app/)
* Create/join rooms at: [https://mini-gmeet-frontend.vercel.app/room](https://mini-gmeet-frontend.vercel.app/room)

⚠️ Demo limitations:

* ❌ No password / room-ID checks
* ❌ No AI transcription/summaries

---

### 🔹 Common Issues

* **Connection failed / can’t join** → check LiveKit URL, CORS, or system clock
* **Token minted but no media** → check camera/mic permissions
* **Firewall/VPN issues** → may block UDP → need TURN server
