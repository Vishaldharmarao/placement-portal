# Code Audit — Placement Portal


Audit date: 2026-10-11

## Verification summary

| Feature | Status | Problems found | Fixes made |
| --- | --- | --- | --- |
| Frontend build | Verified | The `build` script ran bare Vite and started a development server instead of producing a bundle. | Changed it to `vite build`; production bundle succeeds. |
| Signup, errors, and route access | Verified by unit tests and live validation probe | Role profile creation was not atomic; validation returned HTTP 500 with raw Zod detail; frontend allowed a password length rejected by the API and did not restrict URLs by role. | Added transaction handling, aligned password validation, mapped errors safely, and redirect authenticated users to their own role dashboard for disallowed URLs. Backend RBAC remains authoritative. |
| Job management | Build and route authorization verified | Company and admin job pages rendered the student apply screen; expired owned jobs were not available to manage. | Added authenticated `/api/jobs/mine` and a shared company/admin create/edit/delete screen that includes expired jobs. |
| Company dashboard | Build verified | Posted jobs, shortlisted candidates, and interviews were placeholders. | Counts now come from owned jobs and company-scoped application records. |
| Resume upload | Unit-tested signature helper and code inspected | MIME type alone could be spoofed. | Added `%PDF-` signature validation before storing the resume and removed an unverified demo password from the login screen. |
| MySQL/backend startup | Local smoke-tested | Database connectivity and seeded query behavior had not been reported. | Backend `/health` returned healthy; `GET /api/jobs` returned three existing seed records. No existing records were modified. |
| AI service | Local endpoint smoke-tested | Prior report did not establish the service was runnable in this workspace. | FastAPI `/health`, matching, skill-gap, model prediction, and corrupt-PDF rejection responded using the existing local environment. |
| Other workflows | Code inspected, not end-to-end verified | Education CRUD, manual skill editing, admin user mutations, and complete authenticated student/company/admin journeys remain incomplete or unverified. | No behavior is claimed as verified beyond the checks listed below. |

## Checks run

- `npm test --prefix backend`: 7 passed, 0 failed. Coverage includes transaction rollback/commit, safe error mapping, and PDF signatures.
- `npm run build --prefix frontend`: Vite production build passed.
- `node --check` passed for all backend source files.
- Python `compileall` passed for the AI app and training module.
- Local backend `/health` passed against MySQL; `/api/jobs` returned 3 records; invalid registration returned a structured 400; unauthenticated `/api/jobs/mine` returned 401.
- Local FastAPI `/health`, matching, skill-gap, and prediction returned structured results; a MIME-spoofed malformed PDF was rejected with 422.

## Remaining issues

1. **Authenticated end-to-end workflows were not exercised.** No separate test database or disposable authenticated test accounts were created; the local MySQL database was only read by health and listing requests.
2. **Feature gaps remain.** Education CRUD and manual skill editing are not present in the UI; admin student management is read-only. Complete browser workflows and role-isolation checks still need integration tests.
3. **Resume content is signature-checked but not malware-scanned.** Production deployment needs scanning and storage controls.
4. **The model uses fictional demonstration data.** Its result is not a real placement forecast; production use requires institution-approved data, evaluation, fairness testing, versioning, and human review.
5. **The local seed accounts have no supported documented password.** Register a local fictional account to exercise authenticated workflows.
