import { Router } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';
import { query, withTransaction } from '../config/db.js';
import { AppError, asyncRoute, ok } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { evaluateInterviewAnswer } from '../utils/interview.js';
import { getCareerReadiness } from '../services/career-readiness.js';

const router = Router();

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

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
    ok(res, await getCareerReadiness(req.user.id));
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
    const role = String(req.body?.role || '').trim();
    if (role.length < 2 || role.length > 120) {
      throw new AppError('Enter a target role between 2 and 120 characters', 400);
    }

    const [skillRows, projects, resumeRows] = await Promise.all([
      query('SELECT s.name FROM student_skills ss JOIN skills s ON s.id = ss.skill_id WHERE ss.student_id = :id', { id: p.id }),
      query('SELECT title, technologies FROM projects WHERE student_id = :id ORDER BY created_at DESC LIMIT 10', { id: p.id }),
      query('SELECT ra.extracted_skills, ra.missing_skills FROM resume_analysis ra JOIN resumes r ON r.id = ra.resume_id WHERE r.student_id = :id ORDER BY ra.analyzed_at DESC LIMIT 1', { id: p.id }),
    ]);
    const profileSkills = skillRows.map((item) => item.name);
    const resumeSkills = parseJsonArray(resumeRows[0]?.extracted_skills);
    const resumeGaps = parseJsonArray(resumeRows[0]?.missing_skills);
    let jobSkills = [];
    if (req.body?.job_id) {
      const jobId = Number(req.body.job_id);
      if (!Number.isInteger(jobId) || jobId < 1) throw new AppError('Invalid job selected', 400);
      const jobRows = await query('SELECT required_skills FROM jobs WHERE id = :id', { id: jobId });
      if (!jobRows[0]) throw new AppError('Selected job not found', 404);
      jobSkills = parseJsonArray(jobRows[0].required_skills);
    }

    const knownSkills = new Set([...profileSkills, ...resumeSkills].map((skill) => String(skill).toLowerCase()));
    const missingSkills = [...new Set([
      ...resumeGaps,
      ...jobSkills.filter((skill) => !knownSkills.has(String(skill).toLowerCase())),
      ...(Array.isArray(req.body?.missing_skills) ? req.body.missing_skills : []),
    ])];
    const projectContext = projects.map((project) => [project.title, project.technologies].filter(Boolean).join(' - '));
    const localProfileGaps = [];
    if (!profileSkills.length && !resumeSkills.length) localProfileGaps.push('No saved or resume-extracted skills are available.');
    if (!projects.length) localProfileGaps.push('No saved projects are available for project-specific questions.');
    if (!resumeRows.length) localProfileGaps.push('No analyzed resume is available to identify resume-based skill gaps.');

    let data;
    try {
      ({ data } = await client.post('/interview-recommendation', {
        role,
        skills: profileSkills,
        resume_skills: resumeSkills,
        projects: projectContext,
        missing_skills: missingSkills,
      }));
    } catch {
      throw new AppError('Local interview prompt service is unavailable. Try again when the AI service is running.', 503);
    }

    const savedQuestions = [];
    for (const question of data.questions || []) {
      const category = String(question.category || 'General').slice(0, 80);
      const concepts = Array.isArray(question.key_concepts) ? question.key_concepts : [];
      const existing = await query(
        'SELECT id FROM interview_questions WHERE role = :role AND question = :question LIMIT 1',
        { role, question: question.question }
      );
      let questionId = existing[0]?.id;
      if (!questionId) {
        const inserted = await query(
          `INSERT INTO interview_questions(role, category, difficulty, question, ideal_answer, key_concepts)
           VALUES(:role, :category, :difficulty, :question, :ideal_answer, :key_concepts)`,
          {
            role,
            category,
            difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(question.difficulty) ? question.difficulty : 'MEDIUM',
            question: question.question,
            ideal_answer: concepts.length ? `Rubric concepts: ${concepts.join(', ')}.` : 'No rubric is available for this question.',
            key_concepts: JSON.stringify(concepts),
          }
        );
        questionId = inserted.insertId;
      }
      savedQuestions.push({ ...question, question_id: questionId });
    }

    ok(res, {
      ...data,
      questions: savedQuestions,
      missing_skills: missingSkills,
      profile_gaps: localProfileGaps,
    });
  })
);

router.post(
  '/interview/practice',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const role = String(req.body?.role || '').trim();
    const answers = req.body?.answers;
    if (role.length < 2 || role.length > 120 || !Array.isArray(answers) || answers.length < 1) {
      throw new AppError('A target role and at least one answer are required', 400);
    }

    const cleaned = answers.map((item) => ({
      question_id: Number(item?.question_id),
      answer: String(item?.answer || '').trim(),
    }));
    if (cleaned.some((item) => !Number.isInteger(item.question_id) || item.question_id < 1 || item.answer.length < 20 || item.answer.length > 5000)) {
      throw new AppError('Each answer must be 20 to 5000 characters and refer to a valid question', 400);
    }
    if (new Set(cleaned.map((item) => item.question_id)).size !== cleaned.length) {
      throw new AppError('Duplicate question answers are not allowed', 400);
    }

    const student = await profile(req.user.id);
    const evaluations = await withTransaction(async (connection) => {
      const results = [];
      for (const item of cleaned) {
        const [questionRows] = await connection.execute(
          'SELECT id, key_concepts FROM interview_questions WHERE id = :id AND role = :role',
          { id: item.question_id, role }
        );
        if (!questionRows[0]) throw new AppError('Interview question not found for this role', 404);
        const concepts = parseJsonArray(questionRows[0].key_concepts);
        const evaluation = evaluateInterviewAnswer(item.answer, concepts);
        if (evaluation.score == null) throw new AppError('This question has no evaluation rubric', 422);
        await connection.execute(
          `INSERT INTO interview_progress(student_id, question_id, status, score, feedback)
           VALUES(:student_id, :question_id, 'PRACTICED', :score, :feedback)
           ON DUPLICATE KEY UPDATE status = 'PRACTICED', score = VALUES(score), feedback = VALUES(feedback)`,
          {
            student_id: student.id,
            question_id: item.question_id,
            score: evaluation.score,
            feedback: evaluation.feedback,
          }
        );
        results.push({ question_id: item.question_id, ...evaluation });
      }
      return results;
    });

    const averageCoverage = Math.round(evaluations.reduce((total, item) => total + item.score, 0) / evaluations.length);
    ok(res, {
      role,
      questions_answered: evaluations.length,
      average_rubric_coverage: averageCoverage,
      saved: true,
      feedback_type: 'Deterministic keyword coverage against the listed rubric; not an AI assessment.',
      results: evaluations,
    }, 201);
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
    await profile(req.user.id);
    ok(res, null);
  })
);

export default router;