# 🩺 AI MediWound – Intelligent Wound Analysis & Patient Management System

AI MediWound is a professional healthcare platform designed to manage patient wound data, track clinical visits, and perform AI-powered wound assessments. It integrates a Django REST backend, a modern React frontend, and a standalone FastAPI ML service.

## 🏗️ Project Architecture

The system is built with a distributed microservice-friendly architecture:
- **Backend (Django/DRF)**: Manages patients, roles, activity logs, and clinical records. 
- **Frontend (Vite/React)**: A unified dashboard for Admins, Doctors, and Nurses.
- **ML Service (FastAPI)**: Analyzes wound images and provides severity assessments.
- **CI/CD (GitHub Actions)**: Automated testing and linting for all services.

## 🚀 Key Features

- **JWT-Based Authentication**: Secure role-based access control (Admin, Doctor, Nurse).
- **Patient Management**: Centralized records with auto-generated MRN and longitudinal visit tracking.
- **AI Assessment**: Automated wound analysis and cure recommendations.
- **Activity Logging**: Full audit trail for administrative actions.
- **Production Ready**: Externalized secrets, database standardization (MySQL), and optimized CI.

## 🛠️ Tech Stack

### Core Services
- **Backend**: Python 3.12, Django 5.1, Django REST Framework, SimpleJWT.
- **Frontend**: React 19, Vite, Lucide React, Axios.
- **ML Service**: FastAPI, Pillow, NumPy.
- **Database**: MySQL (Standardized across services).

### DevOps & Tools
- **Automation**: GitHub Actions (Linting, Testing, Caching).
- **Configuration**: Environment-driven settings using `python-dotenv`.
- **Formatting**: ESLint (JS), Flake8 (Python).

## ⚙️ Quick Start

### 1. Repository Setup
```bash
git clone https://github.com/botukulakshmanraonaidu/wound_analysis.git
cd wound_analysis
```

### 2. Backend Configuration
```bash
cd backend/Ai_wound/
python -m venv venv
# Activate venv: venv\Scripts\activate (Windows) or source venv/bin/activate (Linux)
pip install -r requirements.txt
cp .env.example .env # Update with your database credentials
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Configuration
```bash
cd frontend/mediwound-add-patients/
npm install
npm run dev
```

### 4. ML Service Configuration
```bash
cd ml_service/
pip install -r requirements.txt
python main.py
```

## 🔄 CI/CD Automation

The project uses a unified **GitHub Actions** workflow (`.github/workflows/ci.yml`) that automatically:
- Installs dependencies and caches them for speed.
- Runs **Flake8** linting on Backend and ML Service.
- Runs **ESLint** (via Node) on the Frontend.
- Executes Django unit tests with a temporary MySQL service.

---
© 2026 AI MediWound Team