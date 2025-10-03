# 🎨 Frontend (Client)

This is the **React frontend** for Interview Online.  
It provides UI for authentication, room creation, and joining video calls.

---

## 🚀 Features
- React + Vite + TailwindCSS + shadcn/ui  
- Auth & dashboard pages  
- Video room (LiveKit SDK)  
- Media controls (mic, camera, screen sharing)  
- Meeting summaries panel  

---

## ⚙️ Setup
```bash
cd client
npm install
npm run dev
````

Open: [http://localhost:5173](http://localhost:5173)

---

## 📂 Structure

```
client/
│── src/
│   ├── components/   # UI components
│   ├── hooks/        # Custom hooks (auth, meeting flow, media controls)
│   ├── pages/        # Pages (login, dashboard, meeting)
│   └── App.jsx       # Root component
```

---

## 🛠️ Tech Stack

* React 18
* TailwindCSS + shadcn/ui
* React Router
* LiveKit SDK
