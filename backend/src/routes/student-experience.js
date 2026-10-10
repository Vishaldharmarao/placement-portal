import { Router } from 'express';
import { z } from 'zod';

import { query } from '../config/db.js';
import {
  AppError,
  asyncRoute,
  ok,
} from '../utils/http.js';

import {
  requireAuth,
  requireRole,
} from '../middleware/auth.js';

const router = Router();

async function getStudentProfileId(userId) {
  const rows = await query(
    `SELECT id
     FROM student_profiles
     WHERE user_id = :userId`,
    { userId }
  );

  if (!rows[0]) {
    throw new AppError(
      'Student profile not found',
      404
    );
  }

  return rows[0].id;
}


/* =========================================================
   PROJECTS
========================================================= */

const projectSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().optional().nullable(),
  technologies: z.string().optional().nullable(),
  github_url: z.string().url().optional().nullable(),
});


router.get(
  '/projects',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const studentId =
      await getStudentProfileId(req.user.id);

    const rows = await query(
      `SELECT
         id,
         title,
         description,
         technologies,
         github_url,
         created_at
       FROM projects
       WHERE student_id = :studentId
       ORDER BY created_at DESC`,
      { studentId }
    );

    ok(res, rows);
  })
);


router.post(
  '/projects',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const data = projectSchema.parse(req.body);

    const studentId =
      await getStudentProfileId(req.user.id);

    const result = await query(
      `INSERT INTO projects
       (
         student_id,
         title,
         description,
         technologies,
         github_url
       )
       VALUES
       (
         :studentId,
         :title,
         :description,
         :technologies,
         :github_url
       )`,
      {
        studentId,
        title: data.title,
        description: data.description || null,
        technologies: data.technologies || null,
        github_url: data.github_url || null,
      }
    );

    ok(
      res,
      {
        id: result.insertId,
        message: 'Project added successfully',
      },
      201
    );
  })
);


router.delete(
  '/projects/:id',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const studentId =
      await getStudentProfileId(req.user.id);

    const result = await query(
      `DELETE FROM projects
       WHERE id = :id
       AND student_id = :studentId`,
      {
        id: req.params.id,
        studentId,
      }
    );

    if (!result.affectedRows) {
      throw new AppError(
        'Project not found',
        404
      );
    }

    ok(res, {
      message: 'Project removed successfully',
    });
  })
);


/* =========================================================
   CERTIFICATIONS
========================================================= */

const certificationSchema = z.object({
  name: z.string().min(1).max(160),

  issuing_organization: z
    .string()
    .max(160)
    .optional()
    .nullable(),

  issue_date: z
    .string()
    .optional()
    .nullable(),

  credential_url: z
    .string()
    .url()
    .optional()
    .nullable(),
});


router.get(
  '/certifications',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const studentId =
      await getStudentProfileId(req.user.id);

    const rows = await query(
      `SELECT
         id,
         name,
         issuing_organization,
         issue_date,
         credential_url
       FROM certifications
       WHERE student_id = :studentId
       ORDER BY issue_date DESC`,
      { studentId }
    );

    ok(res, rows);
  })
);


router.post(
  '/certifications',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const data =
      certificationSchema.parse(req.body);

    const studentId =
      await getStudentProfileId(req.user.id);

    const result = await query(
      `INSERT INTO certifications
       (
         student_id,
         name,
         issuing_organization,
         issue_date,
         credential_url
       )
       VALUES
       (
         :studentId,
         :name,
         :issuing_organization,
         :issue_date,
         :credential_url
       )`,
      {
        studentId,
        name: data.name,
        issuing_organization:
          data.issuing_organization || null,
        issue_date:
          data.issue_date || null,
        credential_url:
          data.credential_url || null,
      }
    );

    ok(
      res,
      {
        id: result.insertId,
        message:
          'Certification added successfully',
      },
      201
    );
  })
);


router.delete(
  '/certifications/:id',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const studentId =
      await getStudentProfileId(req.user.id);

    const result = await query(
      `DELETE FROM certifications
       WHERE id = :id
       AND student_id = :studentId`,
      {
        id: req.params.id,
        studentId,
      }
    );

    if (!result.affectedRows) {
      throw new AppError(
        'Certification not found',
        404
      );
    }

    ok(res, {
      message:
        'Certification removed successfully',
    });
  })
);


/* =========================================================
   INTERNSHIPS
========================================================= */

const internshipSchema = z.object({
  company: z.string().min(1).max(160),

  role: z.string().min(1).max(120),

  description: z
    .string()
    .optional()
    .nullable(),

  start_date: z
    .string()
    .optional()
    .nullable(),

  end_date: z
    .string()
    .optional()
    .nullable(),
});


router.get(
  '/internships',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const studentId =
      await getStudentProfileId(req.user.id);

    const rows = await query(
      `SELECT
         id,
         company,
         role,
         description,
         start_date,
         end_date
       FROM internships
       WHERE student_id = :studentId
       ORDER BY start_date DESC`,
      { studentId }
    );

    ok(res, rows);
  })
);


router.post(
  '/internships',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const data =
      internshipSchema.parse(req.body);

    const studentId =
      await getStudentProfileId(req.user.id);

    const result = await query(
      `INSERT INTO internships
       (
         student_id,
         company,
         role,
         description,
         start_date,
         end_date
       )
       VALUES
       (
         :studentId,
         :company,
         :role,
         :description,
         :start_date,
         :end_date
       )`,
      {
        studentId,
        company: data.company,
        role: data.role,
        description:
          data.description || null,
        start_date:
          data.start_date || null,
        end_date:
          data.end_date || null,
      }
    );

    ok(
      res,
      {
        id: result.insertId,
        message:
          'Internship added successfully',
      },
      201
    );
  })
);


router.delete(
  '/internships/:id',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const studentId =
      await getStudentProfileId(req.user.id);

    const result = await query(
      `DELETE FROM internships
       WHERE id = :id
       AND student_id = :studentId`,
      {
        id: req.params.id,
        studentId,
      }
    );

    if (!result.affectedRows) {
      throw new AppError(
        'Internship not found',
        404
      );
    }

    ok(res, {
      message:
        'Internship removed successfully',
    });
  })
);


export default router;