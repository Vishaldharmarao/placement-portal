import { Router } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { AppError, asyncRoute, ok } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const client = axios.create({
  baseURL: env.aiUrl,
  timeout: 15000,
});

// =========================================================
// GET STUDENT PROFILE
// =========================================================
const profile = async (id) => {
  const rows = await query(
    'SELECT sp.* FROM student_profiles sp WHERE user_id=:id',
    { id }
  );

  if (!rows[0]) {
    throw new AppError('Profile not found', 404);
  }

  return rows[0];
};

/* =========================================================
   PLACEMENT PREDICTION
========================================================= */

router.post(
  '/prediction',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const p = await profile(req.user.id);

    const [
      skills,
      projects,
      certs,
      internships,
      results,
      ats,
    ] = await Promise.all([
      // Skills count
      query(
        'SELECT COUNT(*) AS count FROM student_skills WHERE student_id=:id',
        { id: p.id }
      ),

      // Projects count
      query(
        'SELECT COUNT(*) AS count FROM projects WHERE student_id=:id',
        { id: p.id }
      ),

      // Certifications count
      query(
        'SELECT COUNT(*) AS count FROM certifications WHERE student_id=:id',
        { id: p.id }
      ),

      // Internship count
      query(
        'SELECT COUNT(*) AS count FROM internships WHERE student_id=:id',
        { id: p.id }
      ),

      // ====================================================
      // ASSESSMENT SCORE
      //
      // Every available assessment is counted.
      // Completed assessment -> actual percentage
      // Unattempted assessment -> 0%
      //
      // Example:
      // 100, 88, 100 = 96
      // 100, 0, 0 = 33.33
      // ====================================================
      query(
        `SELECT
           COALESCE(SUM(ar.percentage), 0) / COUNT(a.id) AS score
         FROM assessments a
         LEFT JOIN assessment_results ar
           ON ar.assessment_id = a.id
           AND ar.student_id = :id`,
        { id: p.id }
      ),

      // Latest ATS score
      query(
        `SELECT ra.ats_score
         FROM resumes r
         JOIN resume_analysis ra ON ra.resume_id = r.id
         WHERE r.student_id = :id
         ORDER BY ra.analyzed_at DESC
         LIMIT 1`,
        { id: p.id }
      ),
    ]);

    // ======================================================
    // BUILD REAL PREDICTION PAYLOAD
    // ======================================================

    const payload = {
      // Student profile
      cgpa: Number(p.cgpa || 0),

      // Student skills
      skills_count: Number(
        skills[0]?.count || 0
      ),

      // Projects
      projects_count: Number(
        projects[0]?.count || 0
      ),

      // Certifications
      certifications_count: Number(
        certs[0]?.count || 0
      ),

      // Internship
      internship:
        Number(internships[0]?.count || 0) > 0
          ? 1
          : 0,

      // REAL assessment average
      assessment_score: Number(
        Number(results[0]?.score || 0).toFixed(2)
      ),

      // These are still 0 until we have real
      // coding/communication/interview evaluations.
      coding_score: Number(
        req.body?.coding_score || 0
      ),

      communication_score: Number(
        req.body?.communication_score || 0
      ),

      // Real ATS score from resume analysis
      ats_score: Number(
        ats[0]?.ats_score || 0
      ),

      interview_score: Number(
        req.body?.interview_score || 0
      ),
    };

    // ======================================================
    // DEBUG
    // ======================================================

    console.log('');
    console.log('==========================================');
    console.log('PLACEMENT PREDICTION PAYLOAD');
    console.log('==========================================');
    console.log(payload);
    console.log('==========================================');
    console.log('');

    // ======================================================
    // CALL PYTHON AI SERVICE
    // ======================================================

    const { data } = await client.post(
      '/predict-placement',
      payload
    );

    // ======================================================
    // SAVE PREDICTION
    // ======================================================

    await query(
      `INSERT INTO placement_predictions
       (
         student_id,
         probability,
         prediction_label,
         confidence,
         important_factors
       )
       VALUES
       (
         :student_id,
         :probability,
         :prediction_label,
         :confidence,
         :important_factors
       )`,
      {
        student_id: p.id,

        probability: data.probability,

        prediction_label:
          data.label
            ?.split(' ')[0]
            ?.toUpperCase() || 'UNKNOWN',

        confidence: data.confidence,

        important_factors:
          JSON.stringify(
            data.important_factors || []
          ),
      }
    );

    // ======================================================
    // RETURN RESULT
    // ======================================================

    ok(res, data);
  })
);


/* =========================================================
   JOB MATCHING
========================================================= */

router.post(
  '/job-match',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const p = await profile(req.user.id);

    const rows = await query(
      `SELECT s.name
       FROM student_skills ss
       JOIN skills s ON s.id = ss.skill_id
       WHERE ss.student_id = :id`,
      { id: p.id }
    );

    const student = {
      skills: rows.map((x) => x.name),

      cgpa: Number(
        p.cgpa || 0
      ),

      branch: p.branch,

      graduation_year:
        p.graduation_year,
    };

    const { data } = await client.post(
      '/job-match',
      {
        student,

        job: req.body.job,
      }
    );

    ok(res, data);
  })
);


/* =========================================================
   SKILL GAP
========================================================= */

router.post(
  '/skill-gap',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const p = await profile(req.user.id);

    const rows = await query(
      `SELECT s.name
       FROM student_skills ss
       JOIN skills s ON s.id = ss.skill_id
       WHERE ss.student_id = :id`,
      { id: p.id }
    );

    const currentSkills =
      rows.map((x) => x.name);

    const { data } = await client.post(
      '/skill-gap',
      {
        current_skills:
          currentSkills,

        required_skills:
          Array.isArray(
            req.body.required_skills
          )
            ? req.body.required_skills
            : [],

        role:
          req.body.role ||
          'Target role',
      }
    );

    ok(res, data);
  })
);


/* =========================================================
   INTERVIEW RECOMMENDATIONS
========================================================= */

router.post(
  '/interview/recommendations',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const p = await profile(req.user.id);

    const rows = await query(
      `SELECT s.name
       FROM student_skills ss
       JOIN skills s ON s.id = ss.skill_id
       WHERE ss.student_id = :id`,
      { id: p.id }
    );

    const skills =
      rows.map((x) => x.name);

    const { data } = await client.post(
      '/interview-recommendation',
      {
        role:
          req.body.role ||
          'Software Engineer',

        skills,

        missing_skills:
          Array.isArray(
            req.body.missing_skills
          )
            ? req.body.missing_skills
            : [],
      }
    );

    ok(res, data);
  })
);


/* =========================================================
   LATEST PLACEMENT PREDICTION
========================================================= */

router.get(
  '/prediction/latest',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const p = await profile(req.user.id);

    const rows = await query(
      `SELECT *
       FROM placement_predictions
       WHERE student_id = :id
       ORDER BY created_at DESC
       LIMIT 1`,
      { id: p.id }
    );

    ok(
      res,
      rows[0] || null
    );
  })
);

export default router;