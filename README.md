# FortCode – AI-Powered Algorithm Learning Platform

## Overview
This project was developed as part of the **PIFSJS – 4th Year Engineering Program** at **Esprit School of Engineering** (Academic Year 2025–2026).

FortCode is a full-stack web application designed to help students learn and practice algorithms and data structures through AI-powered mentoring, gamification, and secure code execution.

---

## 1. Project Introduction

### 1.1 Background and Motivation
Learning algorithms and data structures is often challenging due to:

- Lack of personalized feedback  
- Focus on correctness rather than code quality  
- Limited motivation and engagement  
- Poor accessibility for users with disabilities  
- Security risks when executing user-submitted code  

FortCode addresses these challenges through:

- AI-based mentoring and intelligent feedback  
- Gamified learning (points, badges, leaderboards)  
- Secure sandboxed code execution  
- Inclusive accessibility features (WCAG compliance)  

---

### 1.2 Project Objectives

The platform aims to:

- Provide an intelligent and gamified learning environment  
- Enable practice through:
  - Training stages and progressive levels  
  - Competitive battles (User vs User)  
- Allow Admins and Recruiters to manage users and competitions  
- Ensure secure execution and AI-assisted feedback for all submissions  

---

## 2. Business Features Specifications

### 2.1 Functional Requirements

- User Management (Participant, Admin, Recruiter)  
- Training Stages and Levels  
- Battles (User vs User, Recruiter-supervised)  
- Code Submissions with AI + SonarQube analysis  
- Gamification (Points, Badges, Leaderboards)  
- Accessibility Options  
- Analytics and Monitoring  

---

### 2.2 Non-Functional Requirements

- Performance: Fast code evaluation and result display  
- Scalability: Support concurrent battles and submissions  
- Security: JWT authentication and sandbox execution  
- Maintainability: Modular architecture with CI/CD integration  

---

## Tech Stack

- React.js  
- Node.js  
- Express.js  
- MongoDB  
- JavaScript  
- Fullstack Architecture  

---

## Local AI Scoring Setup (Ollama)

FortCode now supports local AI score suggestions through Ollama (no paid API required).

### 1. Install Ollama

- Download and install from `https://ollama.com/download`.

### 2. Pull the model

Run:

```powershell
ollama pull llama3.1:8b
```

### 3. Add backend environment config

- Edit `Back/.env` directly.
- Ensure these values exist:

```env
AI_SCORE_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

If you need even smaller storage, you can try:

- `llama3.2:1b`
- `qwen2.5:1.5b`
- `phi3:mini`
```

### 4. Start services

In one terminal:

```powershell
ollama serve
```

In another terminal:

```powershell
cd Back
npm run dev
```

### 5. What was added in project

- AI scoring service: `Back/src/services/aiScoreAgent.js`
- Provider-aware controller integration: `Back/src/controllers/programmingRoomController.js`

If you want cloud inference later, set `AI_SCORE_PROVIDER=openai` and add `OPENAI_API_KEY` in `Back/.env`.

---

## Academic Context

Developed at **Esprit School of Engineering – Tunisia**  
PIFSJS – 4A | 2025–2026
