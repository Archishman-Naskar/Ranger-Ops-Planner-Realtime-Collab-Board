# Ranger Ops Planner – Realtime Collab Board

A real-time collaborative Kanban-style mission coordination platform built by **Team FullStack Rangers** for the DEV or DIE hackathon. It enables distributed teams to manage tasks, track mission progress, and collaborate instantly with live synchronization across all clients.

---

## 🚀 Overview

Distributed teams often depend on static boards and delayed updates, leading to poor coordination and miscommunication.  
Ranger Ops Planner solves this by offering a **live, real-time synchronized Kanban system** where all updates (task movements, comments, presence changes) are instantly visible without page refreshes.

---

## 📝 Problem Statement

Distributed teams lack a dedicated platform for real-time mission planning.  
Ranger Ops Planner addresses this gap by providing instant synchronization of board activities, enabling teams to collaborate efficiently during high-coordination tasks.  
:contentReference[oaicite:0]{index=0}

---

## 💡 Key Features

- Create and manage boards  
- Lists and cards management  
- Real-time drag & drop  
- Instant WebSocket sync  
- Comment system  
- Member presence indicator  
- Zero page refresh requirements
- Full-text search  
- Card labels  
- Attachment support  
:contentReference[oaicite:1]{index=1}

---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- Socket.IO client
- react-beautiful-dnd
- Tailwind CSS
- Axios

### Backend
- Node.js + Express  
- Socket.IO  
- bcryptjs  

### Database
- MongoDB
:contentReference[oaicite:2]{index=2}

---

## 👥 Team: FullStack Rangers

Details from the project abstract:  
:contentReference[oaicite:4]{index=4}

| Name | Reg No. | Email | GitHub |
|------|---------|--------|--------|
| Archishman Naskar | 20243048 | archishman.20243048@mnnit.ac.in | Archishman-Naskar |
| Arpit Goyal | 20243053 | arpit.20243053@mnnit.ac.in | Rockyoudead8 |
| Aman Singh | 20243024 | aman.20243024@mnnit.ac.in | WebD-aman |
| Ankur Kundu | 20243037 | ankur.20243037@mnnit.ac.in | ankurkdb17 |

---

## 📦 Installation

### 1. Clone the repository

git clone https://github.com/Archishman-Naskar/Ranger-Ops-Planner-Realtime-Collab-Board
cd Ranger-Ops-Planner-Realtime-Collab-Board

Backend Setup (Node.js + Express)
cd server
npm install
PORT=3001


## Create a .env file in /server
```bash

# MongoDB connection
MONGO_URI=your_mongodb_connection_string

# JWT or session secret
JWT_SECRET=your_secret_key

# Cloudinary (only if using uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: Redis for socket scaling
REDIS_URL=redis://localhost:6379


Start the backend
npm run dev

Start the frontend
npm run dev

