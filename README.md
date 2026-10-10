# PlaceFlow — AI-Powered College Placement Portal

PlaceFlow is a full-stack placement-management and career-guidance application for students, placement officers, and companies. It combines a React workspace, secure Express APIs, MySQL storage, and a separate FastAPI/scikit-learn service for explainable career intelligence.

> The placement estimate is a developmental readiness signal, not a guarantee of employment. The training data is fictional and is included only for demonstration. A production institution should train and validate the model on approved historical outcomes, monitor for bias, and keep a human reviewer in the loop.

## What it does

- Student registration, JWT login, password hashing, and role-based access.
- Student profiles, skills, projects, education, credentials, internships, resumes, applications, assessments, and interview progress in a normalized database.
- Company job posting and candidate application workflow.
- Admin dashboard APIs for student, job, application, and skill analytics.
- PDF resume text extraction, extensible phrase-based skill detection, ATS score breakdown, actionable missing-skills feedback, and recommendations.
- Job skill/eligibility match score, skill-gap plan, targeted interview recommendations, and an actual scikit-learn placement estimator.
- Responsive React UI for student, admin, and company workflows, including placement readiness, resumes, opportunities, application tracking, preparation, and analytics.

## Architecture

```text
React + Vite  ──HTTP──>  Express + Node.js  ──SQL──>  MySQL 8
                              │
                              └──HTTP──> FastAPI + NLP + scikit-learn
```

The Node application never contains Python/ML logic. It calls the independent AI service over HTTP.

## Repository layout

```text
frontend/       React, React Router, Axios, responsive CSS
backend/        Express REST API, JWT, validation, MySQL pool, uploads
ai-service/     FastAPI, resume NLP, matcher, skill gap, ML training/prediction
database/       MySQL schema and fictional seed data
docker-compose.yml
```

## Quick start with Docker

1. Install Docker Desktop.
2. From this directory, run `docker compose up --build`.
3. Open `http://localhost:5173`.

Services: frontend `5173`, backend `5000`, AI service `8000`, and MySQL `3306`. The container services communicate via `mysql` and `ai-service`, never `localhost`.

## Local development

Create local environment files from each `.env.example`. Do not commit the resulting `.env` files.

```bash
# terminal 1
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train_model.py
uvicorn app.main:app --reload --port 8000

# terminal 2 — create database first with database/schema.sql and database/seed.sql
cd backend
npm install
npm run dev

# terminal 3
cd frontend
npm install
npm run dev
```

Run the SQL files in order: `database/schema.sql`, then `database/seed.sql`. The seed records are fictional. The existing bcrypt hash is intentionally not treated as a documented account password; register a new account for local use, or replace it with a hash generated for your own local demo password.

## AI service

`POST /analyze-resume` accepts a PDF upload and extracts selectable text through PyPDF2. It normalizes text and checks it against an extensible categorized skill dictionary. Its ATS result is the sum of explained components:

- Skills: 35 points
- Education: 15 points
- Projects: 20 points
- Experience: 15 points
- Certifications: 10 points
- Resume quality/contact details: 10 points

`train_model.py` compares logistic regression and random forest using the development CSV, selects the higher holdout-accuracy candidate, refits it, and saves `trained_models/model.pkl`. Prediction features are documented in `ai-service/app/services/prediction.py`.

## Selected APIs

| Area | Endpoint |
| --- | --- |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Student | `GET/PUT /api/students/profile`, `GET/POST /api/students/skills` |
| Jobs | `GET /api/jobs`, `POST/PUT/DELETE /api/jobs/:id` |
| Applications | `POST/GET /api/applications`, `PUT /api/applications/:id/status` |
| Resumes | `POST /api/resumes/upload`, `POST /api/resumes/:id/analyze` |
| AI | `POST /api/prediction`, `POST /api/job-match`, `POST /api/skill-gap` |
| Admin | `GET /api/admin/dashboard`, `/students`, `/analytics` |

All API responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": ... }`.

## Security notes

- Passwords are hashed with bcrypt.
- JWTs are verified by `requireAuth`; privileged routes also require a role.
- Zod performs request validation and mysql2 parameterized queries prevent SQL injection.
- Resume uploads permit PDF MIME types only and have a 5 MB limit.
- Configure a long, unique `JWT_SECRET`, restrictive frontend origin, database credentials, backups, rate limits, logging, and TLS before deployment.

## Verification performed

- Node syntax checks passed for the API entry point and core routes.
- Python compilation passed for FastAPI, NLP, matching, and prediction modules.
- Full dependency builds were not runnable in this workspace because npm/PyPI dependencies are unavailable and Docker Desktop is not installed. Run the commands above on a connected machine or via Docker to complete integration verification.

## Screenshots

Add project screenshots here after running the frontend.

## Future improvements

- Institution-authorized production model training, evaluation, fairness monitoring, and model versioning.
- Email verification, password reset, audit trail, CSRF/rate limiting, object storage, and virus scanning.
- Rich role/company administration and end-to-end API test suite backed by a disposable MySQL instance.
