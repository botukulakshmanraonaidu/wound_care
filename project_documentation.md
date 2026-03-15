# Project Documentation: MediWound (Wound care & Analysis)

## 1. Project Overview
**MediWound** is an enterprise-grade healthcare platform designed for advanced wound management and analysis. It integrates a React frontend with a Django backend to provide clinical staff (Admins, Doctors, and Nurses) with a centralized system for patient admissions, task tracking, and machine-learning-driven wound assessment.

---

## 2. Technical Stack
*   **Frontend**: React (Vite-based), Vanilla CSS (Custom UI Components), Lucide-React Icons.
*   **Backend**: Django 6.0, Django REST Framework (DRF).
*   **Database**: PostgreSQL (Hosted on Supabase/Render).
*   **Media Storage**: Cloudinary (Remote file storage for wound images).
*   **Static Assets**: WhiteNoise (Handles compressed static files in production).
*   **API Protocol**: RESTful API with JSON communication.

---

## 3. Core Modules & Functionality

### Admin Dashboard
*   **User Management**: CRUD operations for Doctors, Nurses, and Admins.
*   **Role-Based Access**: Specialized access levels (Limited vs. Full).
*   **Patient Directory**: Global list of patients with a secure **Delete** action protected by a custom confirmation modal.
*   **Activity Logs**: Real-time auditing of system changes, logins, and status updates.

### Doctor Dashboard
*   **Patient Admissions**: Form-driven admission with unique MRN (Medical Record Number) generation.
*   **Newly Assigned Feed**: Shows patients admitted within the **last 1 hour** who have no assigned nurse.
*   **Wound Assessments**: Interface for capturing wound type, stage, exudate, and dimensions.
*   **Priority Attention**: Automatic filtering of ICU/Emergency cases updated within the last 24 hours.

### Nurse Dashboard
*   **Assignment Management**: Dynamically updated list of assigned patients.
*   **Strict Access Control**: Backend enforced privacy; nurses can **only** access patients specifically assigned to them. The "All Patients" view is disabled for this role.
*   **Smart "Newly Assigned" Filter**: Mirroring the doctor's view but customized for nurse review; patients drop off once their profile/report is viewed (tracked via local storage sync).
*   **Task Interface**: List of scheduled wound care duties.

### Wound Analysis & ML
*   **Image Processing**: Uploads to Cloudinary; stores relative paths in DB.
*   **Tissue Composition**: Analyzes wounds for Granulation, Slough, and Necrotic tissue percentages.
*   **Reporting**: Automated PDF generation for patient wound progress.

---

## 4. Security Architecture
*   **Authentication**: Stateless **JWT (JSON Web Token)**. Access tokens (1 day) and Refresh tokens (7 days).
*   **Authorization**: Role-Based Access Control (RBAC) enforced via custom DRF permission classes (`isAdminRole`, etc.).
*   **Password Safety**: **PBKDF2 with SHA256** hashing. Plaintext passwords are never stored.
*   **Data Integrity**: Strictly uses **Django ORM**, providing built-in protection against **SQL Injection**.
*   **Input Validation**: Serializer-level validation for all data formats (emails, dates, numeric ranges).
*   **HTTPS Enforcement**: Strict SSL orientation with HSTS and secure cookies in production.

---

## 5. Data Flow (Insights)
*   **Image URLs**: The database stores the path (e.g., `wound_images/full/img.jpg`). The DRF Serializer (`use_url=True`) converts this to a full temporary Cloudinary URL for the React frontend.
*   **Patient MRN**: Systemically generated unique identifiers to prevent duplicate records.
*   **Time Tracking**: dashboard feeds (Like "Newly Assigned" or "Priority") rely on `created_at` and `updated_at` timezone-aware timestamps.

---

## 6. Master Prompt for LLM Development
*Copy the following block to initialize an LLM for continued development of this project:*

> "I am working on a project called **MediWound**, a healthcare platform for wound analysis. 
> **Architecture**: React (Frontend) + Django REST Framework (Backend) + PostgreSQL.
> **Security**: JWT Auth, RBAC (Admin/Doctor/Nurse), and Django ORM for SQLi protection.
> **Key Database Entity**: `Patient` (with MRN), `Assessment` (with ML JSON results), and `Admin` (Custom user model).
> **Media**: Managed via Cloudinary with path-based storage in Postgres.
> 
> **Instructions for AI**: 
> 1. Follow the existing **Vanilla CSS** design system (Premium UI, dark/light themes, Lucide icons).
> 2. Ensure all API calls use the `AuthAPI` helper on the frontend to maintain JWT logic.
> 3. Enforce RBAC in both frontend routing and backend views (`permission_classes`).
> 4. Keep logic decentralized: Services for APIs, Components for UI, and Models for Data.
> 5. Use timezone-aware timestamps for all dashboard filters (e.g., 1-hour or 24-hour windows)."

---
