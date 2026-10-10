# Code Audit — Placement Portal

Audit date: 2026-09-04

## Verification summary

| Feature | Status | Problems found | Fixes made |
| --- | --- | --- | --- |
| Frontend route/API alignment | Partial | Dashboards displayed fixed metrics; job cards used an index-based fixed match; assessments, interview page, company profile, and analytics were not connected to APIs. | Added student dashboard, assessment, company, and interview API routes; wired dashboards, jobs, prediction history, interview suggestions, assessments, company profile, and analytics to live endpoints. |
| Backend routing | Verified | The API had no assessment/company/dashboard routes although frontend routes implied those functions. | Added `assessments.js`, `companies.js`, and `dashboard.js`, and registered them in `server.js`. |
| Database/query alignment | Verified for exercised queries | Placement predictions stored a percentage in the `probability` column; company users could update any application status. | Persisted 0–1 probability and scoped company status updates through `jobs` and `companies`. Queries use schema table/column names and parameter binding. |
| Authentication and RBAC | Verified logically | None in token generation/verification flow. | Confirmed bcrypt hashing, 7-day signed JWT, `requireAuth`, role checks, and password omission from login responses. Company update authorization was tightened. |
| Resume upload and analysis | Verified by code inspection | FastAPI form parsing dependency was missing. | Added `python-multipart`. React posts `resume`; Express validates PDF MIME/5 MB, stores metadata, sends bytes to FastAPI, and persists analysis. |
| PDF/NLP/ATS | Verified by code inspection | No fake response was found. Extraction requires a selectable-text PDF. | Confirmed PyPDF2 extraction, normalized phrase matching against an extensible categorized dictionary, and content-dependent ATS components. |
| Job match and skill gap | Verified | Frontend displayed fixed 94/88/81 scores. | Frontend now calls the authenticated `/job-match` proxy per job. FastAPI compares normalized current/required skills plus CGPA, branch, and year dynamically; skill gaps use set differences. |
| Placement prediction | Verified by code inspection | Stored prediction scale was wrong; full runtime test cannot run without dependencies. | Corrected persistence. `prediction.py` trains/evaluates logistic regression and random forest against the CSV, saves a joblib model, and predicts via `predict_proba`. |
| Interview recommendations | Verified | UI always passed a hardcoded role and service ignored current skills. | Added configurable target role; recommendations now incorporate role, profile skills, and missing skills. |
| Admin analytics | Verified | Admin overview and analytics had fixed UI values. | UI now consumes `/api/admin/dashboard` and `/api/admin/analytics`, both derived from MySQL tables. |
| Company applicant management | Verified | Applicant status endpoint was not ownership-scoped and UI did not update status. | Added ownership constraint and live candidate status selector. |
| Docker/README | Partial | FastAPI multipart package absent; Docker cannot be run in this environment. | Added dependency and checked Docker service hostnames/configuration by inspection. README documents the actual environment limitation. |

## Checks run

- Node syntax checks for `server.js`, AI routes, company routes, dashboard routes, and assessment routes.
- Python compilation for FastAPI app, NLP, matching, prediction, and training modules.
- Deterministic matching and skill-gap assertions: passed.
- Searches for `TODO`, `FIXME`, `mock`, `dummy`, `placeholder`, and hardcoded scoring/prediction patterns; dynamic dashboard/job paths were corrected.

## Remaining issues

1. **End-to-end run is not verified in this workspace.** npm/PyPI dependencies cannot be installed here and Docker Desktop is unavailable. Run `docker compose up --build` or the documented three-terminal setup on a connected machine.
2. **The UI is a functional core, not full CRUD coverage of every schema table.** Education, projects, certifications, internships, skill editing, assessment taking/submission, company job create/edit/delete, and admin application status controls have database support or APIs in part, but do not yet all have dedicated interactive screens.
3. **Resume MIME checks should be supplemented by content/magic-byte validation and malware scanning in production.**
4. **The development ML data is fictional and too small for real placement decisions.** Production use requires institution-approved data, evaluation, fairness testing, versioning, and human review.
5. **Source files are currently compacted into single-line modules.** They are syntactically valid but should be split into controllers/services/components before team-scale maintenance. This is a maintainability concern, not an API mismatch.
