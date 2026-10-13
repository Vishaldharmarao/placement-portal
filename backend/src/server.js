import express from 'express';
import cors from 'cors';

import { pool } from './config/db.js';
import { env, missingEnvironment } from './config/env.js';
import { errorHandler } from './middleware/error.js';

import auth from './routes/auth.js';
import studentExperience from './routes/student-experience.js';
import students from './routes/students.js';
import jobs from './routes/jobs.js';
import applications from './routes/applications.js';
import resumes from './routes/resumes.js';
import ai from './routes/ai.js';
import admin from './routes/admin.js';
import assessments from './routes/assessments.js';
import companies from './routes/companies.js';
import dashboard from './routes/dashboard.js';

/* =========================================================
   ENVIRONMENT CHECK
========================================================= */

if (missingEnvironment.length) {
  throw new Error(
    `Missing environment variables: ${missingEnvironment.join(', ')}`
  );
}

/* =========================================================
   APP SETUP
========================================================= */

const app = express();

const allowedOrigins = new Set([
  env.frontendUrl,
  ...(!env.production
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : []),
]);

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '1mb',
  })
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get('/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      success: true,
      data: {
        service: 'backend',
        status: 'healthy',
      },
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   AUTH
========================================================= */

app.use('/api/auth', auth);

/* =========================================================
   STUDENT EXPERIENCE
   IMPORTANT:
   Must come BEFORE students.js because students.js
   contains /:id.
========================================================= */

app.use(
  '/api/students',
  studentExperience
);

/* =========================================================
   STUDENT PROFILE + SKILLS
========================================================= */

app.use(
  '/api/students',
  students
);

/* =========================================================
   OTHER ROUTES
========================================================= */

app.use(
  '/api/student-dashboard',
  dashboard
);

app.use(
  '/api/jobs',
  jobs
);

app.use(
  '/api/applications',
  applications
);

app.use(
  '/api/resumes',
  resumes
);

app.use(
  '/api/assessments',
  assessments
);

app.use(
  '/api/companies',
  companies
);

app.use(
  '/api',
  ai
);

app.use(
  '/api/admin',
  admin
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(errorHandler);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  env.port,
  () => {
    console.log(`API listening on :${env.port}`);
  }
);

export default app;