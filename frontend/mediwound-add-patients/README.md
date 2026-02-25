🩺 AI MediWound – Intelligent Wound Analysis & Patient Management System

AI MediWound is a healthcare-focused web application designed to manage patient wound data, track clinical visits, and provide a scalable foundation for AI-powered wound assessment.
The system supports role-based access control, secure APIs, and is built with clean backend architecture suitable for real-world hospital workflows.

📌 Problem Statement

In clinical environments, wound monitoring is often:

Manual and error-prone

Poorly documented across multiple visits

Lacking structured data for AI analysis

AI MediWound solves this by:

Centralizing patient and wound visit data

Enabling structured, longitudinal tracking

Preparing the system for future AI-driven wound severity and healing predictions

🎯 Key Objectives

Digitize wound-related patient data

Track multiple visits per patient with latest-visit awareness

Enforce secure role-based access

Provide REST APIs ready for AI model integration

Maintain clean, scalable backend architecture

🚀 Features
🔐 Authentication & Authorization

JWT-based authentication

Role-based access control:

Admin

Doctor

Nurse

Dashboard access restricted by user role

🧑‍⚕️ Patient Management

Patient registration with auto-generated MRN

View, update, and manage patient records

Secure patient data handling

📆 Visit Tracking

Multiple visits per patient

Automatic update of latest visit date

Historical visit record maintenance

🧠 AI-Ready Architecture

Clean separation of concerns

Scalable design for future:

Wound image analysis

Severity prediction

Healing time estimation

🛠️ Tech Stack
Backend

Language: Python

Framework: Django

API Layer: Django REST Framework

Authentication: JWT (JSON Web Tokens)

Database

SQLite (Development)

PostgreSQL (Production ready)

Frontend (Planned / Partial)

React.js

Role-based dashboards

Tools & Utilities

Git & GitHub

Postman (API testing)

Virtual Environment (venv)

🏗️ System Architecture
Client (React)
     |
     |  REST API (JWT Secured)
     |
Backend (Django + DRF)
     |
     | ORM
     |
Database (SQLite / PostgreSQL)

📂 Project Structure
Ai-MediWound/
│
├── backend/
│   ├── app/
│   │   ├── models.py          # Database models
│   │   ├── serializers.py     # API serializers
│   │   ├── views.py           # API views
│   │   ├── urls.py            # App routes
│   │   └── permissions.py     # Role-based access
│   │
│   ├── manage.py
│   ├── requirements.txt
│   └── settings.py
│
├── README.md
└── .gitignore

⚙️ Installation & Setup
1️⃣ Clone Repository
git clone https://github.com/yourusername/ai-mediwound.git
cd ai-mediwound

2️⃣ Create Virtual Environment
python -m venv venv


Activate:

venv\Scripts\activate     # Windows
source venv/bin/activate # Linux/Mac

3️⃣ Install Dependencies
pip install -r requirements.txt

4️⃣ Apply Migrations
python manage.py makemigrations
python manage.py migrate

5️⃣ Create Superuser
python manage.py createsuperuser

6️⃣ Run Development Server
python manage.py runserver