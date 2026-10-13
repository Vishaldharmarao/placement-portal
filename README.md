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
```

## Windows local setup

Prerequisites: Node.js 20+, Python 3.10+, and MySQL 8 installed as a Windows service. The default local ports are MySQL `3306`, backend `5000`, AI service `8000`, and frontend `5173`.

Check MySQL in PowerShell with `Get-Service MySQL80`. If the database is new, use MySQL Workbench to execute `database/schema.sql`, followed by `database/seed.sql` once. The seed contains fictional records; do not rerun it against an initialized database. Existing databases should not be reinitialized over user data.

Keep existing `.env` files. Only create one from its template when it does not already exist, then edit the local credentials and secrets without committing the result.

In a PowerShell terminal from the repository root:

```powershell
Set-Location ai-service
if (!(Test-Path .env)) { Copy-Item .env.example .env }
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe train_model.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```powershell
Set-Location backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run dev
```

Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a unique `JWT_SECRET` in `backend/.env`. The default AI and frontend URLs in the template target the local services.

In a third terminal:

```powershell
Set-Location frontend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run dev
```

Open `http://localhost:5173`. Verify the backend at `http://localhost:5000/health` and the AI service at `http://localhost:8000/health`. The database schema and seed scripts are initialization-only; they do not reset or migrate an existing database. No demo password is provided for the fictional seed accounts; register a local account or set a password hash through an approved local database procedure.

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
| Jobs | `GET /api/jobs`, `GET /api/jobs/mine`, `POST/PUT/DELETE /api/jobs/:id` |
| Applications | `POST/GET /api/applications`, `PUT /api/applications/:id/status` |
| Resumes | `POST /api/resumes/upload`, `POST /api/resumes/:id/analyze` |
| AI | `POST /api/prediction`, `POST /api/job-match`, `POST /api/skill-gap` |
| Admin | `GET /api/admin/dashboard`, `/students`, `/analytics` |

All API responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": ... }`.

## Security notes

- Passwords are hashed with bcrypt.
- JWTs are verified by `requireAuth`; privileged routes also require a role.
- Zod performs request validation and mysql2 parameterized queries prevent SQL injection.
- Resume uploads check PDF MIME type and file signature, with a 5 MB limit.
- Configure a long, unique `JWT_SECRET`, restrictive frontend origin, database credentials, backups, rate limits, logging, and TLS before deployment.

## Verification performed

- `npm test --prefix backend`: 7 tests passed for transaction handling, safe error mapping, and PDF signatures.
- `npm run build --prefix frontend`: production bundle completed successfully.
- `node --check` passed for all backend JavaScript source; Python `compileall` passed for the AI service and training module.
- Local backend `/health` returned healthy with MySQL; `/api/jobs` returned three seeded jobs; invalid registration returned structured HTTP 400; `/api/jobs/mine` rejected unauthenticated access with 401.
- Local FastAPI `/health`, job matching, skill-gap analysis, and prediction responded. A MIME-spoofed corrupt PDF was rejected with HTTP 422.
- Authenticated student/company/admin end-to-end workflows have not yet been verified. The seed account password is intentionally undocumented; use a fictional local account for manual testing.



## Future improvements

- Institution-authorized production model training, evaluation, fairness monitoring, and model versioning.
- Email verification, password reset, audit trail, CSRF/rate limiting, object storage, and virus scanning.
- Rich role/company administration and end-to-end API test suite backed by a disposable MySQL instance.
