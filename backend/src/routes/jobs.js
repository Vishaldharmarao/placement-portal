import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/db.js';
import {
  AppError,
  asyncRoute,
  ok
} from '../utils/http.js';
import {
  requireAuth,
  requireRole
} from '../middleware/auth.js';

const router = Router();


// =========================================================
// Helpers
// =========================================================

function parseList(value) {
  if (!value) return [];

  // Already an array
  if (Array.isArray(value)) {
    return value;
  }

  // Try JSON first
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not JSON - continue as comma-separated text
    }

    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  return [];
}


// =========================================================
// Validation
// =========================================================

const jobSchema = z.object({
  title: z
    .string()
    .min(2)
    .max(160),

  description: z
    .string()
    .min(10),

  required_skills: z
    .array(z.string())
    .min(1),

  minimum_cgpa: z
    .coerce
    .number()
    .min(0)
    .max(10)
    .default(0),

  eligible_branches: z
    .array(z.string())
    .default([]),

  graduation_year: z
    .coerce
    .number()
    .int()
    .optional(),

  salary: z
    .string()
    .max(100)
    .optional(),

  location: z
    .string()
    .max(120)
    .optional(),

  job_type: z
    .enum([
      'FULL_TIME',
      'INTERNSHIP',
      'PART_TIME',
      'CONTRACT'
    ])
    .default('FULL_TIME'),

  deadline: z
    .string()
    .date()
    .optional()
});


// =========================================================
// Company helper
// =========================================================

const companyFor = async (id) => {

  const rows = await query(
    'SELECT id FROM companies WHERE user_id=:id',
    { id }
  );

  if (!rows[0]) {
    throw new AppError(
      'Company profile not found',
      404
    );
  }

  return rows[0];
};


// =========================================================
// GET ALL JOBS
// =========================================================

router.get(
  '/',
  asyncRoute(async (req, res) => {

    const {
      search = '',
      location = '',
      type = '',
      sort = 'match'
    } = req.query;


    let sql = `
      SELECT
        j.*,
        c.company_name,
        c.website,
        c.location AS company_location
      FROM jobs j
      JOIN companies c
        ON c.id = j.company_id
      WHERE
        (j.deadline IS NULL
        OR j.deadline >= CURDATE())
    `;


    const params = {};


    // Search
    if (search) {

      sql += `
        AND (
          j.title LIKE :search
          OR c.company_name LIKE :search
        )
      `;

      params.search = `%${search}%`;
    }


    // Location
    if (location) {

      sql += `
        AND j.location LIKE :location
      `;

      params.location =
        `%${location}%`;
    }


    // Job type
    if (type) {

      sql += `
        AND j.job_type = :type
      `;

      params.type = type;
    }


    // Sorting
    if (sort === 'latest') {

      sql += `
        ORDER BY j.created_at DESC
      `;

    } else {

      sql += `
        ORDER BY j.deadline ASC
      `;

    }


    const rows =
      await query(sql, params);


    // IMPORTANT:
    // Supports both:
    //
    // ["SQL","Python","Java"]
    //
    // AND:
    //
    // SQL,Python,Java

    const jobs = rows.map((job) => ({

      ...job,

      required_skills:
        parseList(job.required_skills),

      eligible_branches:
        parseList(job.eligible_branches)

    }));


    ok(res, jobs);

  })
);


router.get(
  '/mine',
  requireAuth,
  requireRole('COMPANY', 'ADMIN'),
  asyncRoute(async (req, res) => {
    const company = req.user.role === 'COMPANY'
      ? await companyFor(req.user.id)
      : null;
    const rows = await query(
      `SELECT j.*, c.company_name
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       ${company ? 'WHERE j.company_id = :company_id' : ''}
       ORDER BY j.created_at DESC`,
      company ? { company_id: company.id } : {}
    );

    ok(res, rows.map((job) => ({
      ...job,
      required_skills: parseList(job.required_skills),
      eligible_branches: parseList(job.eligible_branches),
    })));
  })
);


// =========================================================
// GET SINGLE JOB
// =========================================================

router.get(
  '/:id',
  asyncRoute(async (req, res) => {

    const rows = await query(
      `
      SELECT
        j.*,
        c.company_name,
        c.description AS company_description,
        c.website
      FROM jobs j
      JOIN companies c
        ON c.id = j.company_id
      WHERE j.id = :id
      `,
      {
        id: req.params.id
      }
    );


    if (!rows[0]) {

      throw new AppError(
        'Job not found',
        404
      );

    }


    const job = {

      ...rows[0],

      required_skills:
        parseList(rows[0].required_skills),

      eligible_branches:
        parseList(rows[0].eligible_branches)

    };


    ok(res, job);

  })
);


// =========================================================
// CREATE JOB
// =========================================================

router.post(
  '/',
  requireAuth,
  requireRole('COMPANY', 'ADMIN'),

  asyncRoute(async (req, res) => {

    const data =
      jobSchema.parse(req.body);


    const company =
      req.user.role === 'COMPANY'
        ? await companyFor(req.user.id)
        : {
            id: req.body.company_id
          };


    if (!company.id) {

      throw new AppError(
        'company_id is required',
        400
      );

    }


    const result =
      await query(
        `
        INSERT INTO jobs
        (
          company_id,
          title,
          description,
          required_skills,
          minimum_cgpa,
          eligible_branches,
          graduation_year,
          salary,
          location,
          job_type,
          deadline
        )
        VALUES
        (
          :company_id,
          :title,
          :description,
          :required_skills,
          :minimum_cgpa,
          :eligible_branches,
          :graduation_year,
          :salary,
          :location,
          :job_type,
          :deadline
        )
        `,
        {

          ...data,

          company_id:
            company.id,

          required_skills:
            JSON.stringify(
              data.required_skills
            ),

          eligible_branches:
            JSON.stringify(
              data.eligible_branches
            ),

          graduation_year:
            data.graduation_year || null,

          salary:
            data.salary || null,

          location:
            data.location || null,

          deadline:
            data.deadline || null

        }
      );


    ok(
      res,
      {
        id: result.insertId
      },
      201
    );

  })
);


// =========================================================
// UPDATE JOB
// =========================================================

router.put(
  '/:id',
  requireAuth,
  requireRole('COMPANY', 'ADMIN'),

  asyncRoute(async (req, res) => {

    const data =
      jobSchema.parse(req.body);


    const company =
      req.user.role === 'COMPANY'
        ? await companyFor(req.user.id)
        : null;


    const result =
      await query(
        `
        UPDATE jobs
        SET
          title = :title,
          description = :description,
          required_skills = :required_skills,
          minimum_cgpa = :minimum_cgpa,
          eligible_branches = :eligible_branches,
          graduation_year = :graduation_year,
          salary = :salary,
          location = :location,
          job_type = :job_type,
          deadline = :deadline
        WHERE
          id = :id
          ${
            company
              ? 'AND company_id = :company_id'
              : ''
          }
        `,
        {

          ...data,

          id: req.params.id,

          company_id:
            company?.id,

          required_skills:
            JSON.stringify(
              data.required_skills
            ),

          eligible_branches:
            JSON.stringify(
              data.eligible_branches
            ),

          graduation_year:
            data.graduation_year || null,

          salary:
            data.salary || null,

          location:
            data.location || null,

          deadline:
            data.deadline || null

        }
      );


    if (!result.affectedRows) {

      throw new AppError(
        'Job not found',
        404
      );

    }


    ok(
      res,
      {
        message:
          'Job updated'
      }
    );

  })
);


// =========================================================
// DELETE JOB
// =========================================================

router.delete(
  '/:id',
  requireAuth,
  requireRole('COMPANY', 'ADMIN'),

  asyncRoute(async (req, res) => {

    const company =
      req.user.role === 'COMPANY'
        ? await companyFor(req.user.id)
        : null;


    const result =
      await query(
        `
        DELETE FROM jobs
        WHERE
          id = :id
          ${
            company
              ? 'AND company_id = :company_id'
              : ''
          }
        `,
        {

          id: req.params.id,

          company_id:
            company?.id

        }
      );


    if (!result.affectedRows) {

      throw new AppError(
        'Job not found',
        404
      );

    }


    ok(
      res,
      {
        message:
          'Job deleted'
      }
    );

  })
);


export default router;