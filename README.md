# 🤝 Smart Meeting Platform for Real-Time Sign Language Conversion

> An AI-powered inclusive web-based meeting platform that enables real-time two-way communication between deaf and non-deaf users through speech-to-sign-language and sign-language-to-speech conversion.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Author](#author)
- [Supervisor](#supervisor)
- [References](#references)

---

## 📖 Overview

Most online meeting platforms — Zoom, Google Meet, Microsoft Teams — are designed primarily for users who can hear and speak normally. This leaves deaf individuals, who rely on **sign language** as their primary mode of communication, largely excluded from digital meetings and collaborative environments.

This project addresses that gap by developing a **Smart Meeting Platform** that leverages **Artificial Intelligence (AI)**, **computer vision**, and **speech recognition** to provide real-time, two-way conversion between speech and sign language — making online meetings accessible to everyone.

---

## ❗ Problem Statement

Despite the availability of many video conferencing tools, deaf individuals face persistent barriers:

- Existing platforms lack real-time **sign language recognition or translation**
- No support for converting **speech into sign language**
- No true **two-way communication** between deaf and non-deaf users
- Limited use of AI for inclusive digital communication

This results in exclusion, poor collaboration, and unequal participation in online meetings.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎥 Real-Time Video Meetings | Join and host video meetings with multiple participants |
| 🗣️ Speech → Sign Language | Converts spoken audio into sign language (via avatar) in real time |
| 🤲 Sign Language → Speech/Text | Recognizes user gestures via camera and converts to speech or text |
| 🔁 Two-Way Communication | Seamless inclusive communication between deaf and non-deaf users |
| 👤 User Management | Admin panel for managing users, meetings, and system monitoring |
| 📝 Live Captions | Automatic speech-to-text captioning during meetings |

---

## 🏗️ System Architecture

The platform is composed of five core modules that work together in real time:

```
┌─────────────────────────────────────────────────┐
│              Smart Meeting Platform              │
│                                                 │
│  ┌──────────────┐     ┌───────────────────────┐ │
│  │  Video Meet  │────▶│ Speech Processing     │ │
│  │  Module      │     │ (Speech → Text/Signs) │ │
│  └──────────────┘     └───────────────────────┘ │
│         │                        │              │
│         ▼                        ▼              │
│  ┌──────────────┐     ┌───────────────────────┐ │
│  │  Sign Lang.  │────▶│ Sign Language Avatar  │ │
│  │  Recognition │     │ Generation Module     │ │
│  └──────────────┘     └───────────────────────┘ │
│              │                   │              │
│              └─────────┬─────────┘              │
│                        ▼                        │
│              ┌──────────────────┐               │
│              │   User Interface │               │
│              └──────────────────┘               │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ Technologies Used

> *(To be updated as development progresses)*

- **Frontend:** HTML, CSS, JavaScript / React.js
- **Backend:** Node.js / Python (Flask or Django)
- **AI/ML:** Computer Vision (OpenCV), Speech Recognition (Google Speech-to-Text API)
- **Real-Time Communication:** WebRTC / Socket.IO
- **Sign Language Processing:** MediaPipe / TensorFlow
- **Database:** MySQL / MongoDB

---

## 🚀 Getting Started

### Prerequisites

```bash
# Ensure you have the following installed:
- Node.js >= 16.x
- Python >= 3.9
- npm or yarn
- pip
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/smart-meeting-platform.git

# 2. Navigate to the project directory
cd smart-meeting-platform

# 3. Install frontend dependencies
npm install

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Configure environment variables
cp .env.example .env
# Edit .env with your API keys and database credentials

# 6. Start the development server
npm run dev
```

---

## 💻 Usage

1. **Register / Log in** to the platform
2. **Create or join** a meeting using a meeting link or ID
3. **Non-deaf users** — speak normally; the platform will convert your speech into sign language displayed to deaf participants
4. **Deaf users** — communicate using sign language in front of your camera; the system will translate gestures into speech or text for other participants
5. **Admin** — manage users and meetings from the admin dashboard

---

## 📁 Project Structure

```
smart-meeting-platform/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   └── public/
├── backend/
│   ├── api/
│   ├── models/
│   ├── services/
│   │   ├── speech_processor.py
│   │   └── sign_language_recognizer.py
│   └── app.py
├── ai_models/
│   ├── gesture_recognition/
│   └── speech_to_sign/
├── docs/
├── .env.example
├── requirements.txt
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 👨‍💻 Author

**Said Juma Sinchimba**  
Registration Number: `NIT/BIT/2023/2127`  
Program: Bachelor of Information Technology (BIT) — Level 8  
National Institute of Transport (NIT)  
Faculty of Information Technology and Education  
Department of Computing and Communication Technology

---

## 👨‍🏫 Supervisor

**Mr. Martin Mushi**  
National Institute of Transport (NIT)

---

## 📚 References

- Zoom Video Communications Inc. (2026). *Zoom: Video conferencing platform*. https://zoom.us/
- Google LLC. (2026). *Google Meet: Secure video meetings*. https://meet.google.com/
- Google Cloud. (2026). *Speech-to-Text: Automatic speech recognition*. https://cloud.google.com/speech-to-text
- Microsoft Corporation. (2026). *Microsoft Teams: Group chat and video conferencing*. https://www.microsoft.com/teams
- Russell, S., & Norvig, P. (2021). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson.
- Szeliski, R. (2022). *Computer Vision: Algorithms and Applications*. Springer.
- Jurafsky, D., & Martin, J. H. (2023). *Speech and Language Processing*. Pearson.

---

<p align="center">
  Made with ❤️ for inclusive communication — NIT, 2026
</p>
