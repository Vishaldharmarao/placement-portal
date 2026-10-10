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


/* =========================================================
   GET STUDENT PROFILE
========================================================= */

const profile = async (userId) => {
  const rows = await query(
    `SELECT id
     FROM student_profiles
     WHERE user_id = :id`,
    { id: userId }
  );

  if (!rows[0]) {
    throw new AppError(
      'Student profile not found',
      404
    );
  }

  return rows[0];
};


/* =========================================================
   GET ALL ASSESSMENTS
========================================================= */

router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const rows = await query(
      `SELECT
         id,
         title,
         category,
         difficulty,
         duration_minutes
       FROM assessments
       ORDER BY id`
    );

    ok(res, rows);
  })
);


/* =========================================================
   GET STUDENT'S COMPLETED ASSESSMENTS
========================================================= */

router.get(
  '/results',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {
    const p = await profile(req.user.id);

    const rows = await query(
      `SELECT
         ar.id,
         ar.assessment_id,
         ar.score,
         ar.percentage,
         ar.completed_at,
         a.title,
         a.category,
         a.difficulty
       FROM assessment_results ar
       JOIN assessments a
         ON a.id = ar.assessment_id
       WHERE ar.student_id = :studentId
       ORDER BY ar.completed_at DESC`,
      {
        studentId: p.id,
      }
    );

    ok(res, rows);
  })
);


/* =========================================================
   GET ONE ASSESSMENT + QUESTIONS
========================================================= */

router.get(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const assessment = await query(
      `SELECT
         id,
         title,
         category,
         difficulty,
         duration_minutes
       FROM assessments
       WHERE id = :id`,
      {
        id: req.params.id,
      }
    );

    if (!assessment[0]) {
      throw new AppError(
        'Assessment not found',
        404
      );
    }

    const questions = await query(
      `SELECT
         id,
         question,
         option_a,
         option_b,
         option_c,
         option_d
       FROM questions
       WHERE assessment_id = :id
       ORDER BY id`,
      {
        id: req.params.id,
      }
    );

    ok(res, {
      ...assessment[0],
      questions,
    });
  })
);


/* =========================================================
   SUBMIT ASSESSMENT
   ONE ATTEMPT PER STUDENT PER ASSESSMENT
========================================================= */

router.post(
  '/:id/submit',
  requireAuth,
  requireRole('STUDENT'),
  asyncRoute(async (req, res) => {

    /* -------------------------------------------------------
       Validate request
    ------------------------------------------------------- */

    const body = z
      .object({
        answers: z
          .array(
            z.object({
              question_id:
                z.coerce.number().int(),

              answer:
                z.enum([
                  'A',
                  'B',
                  'C',
                  'D',
                ]),
            })
          )
          .min(1),
      })
      .parse(req.body);


    /* -------------------------------------------------------
       Get student
    ------------------------------------------------------- */

    const p =
      await profile(req.user.id);


    /* -------------------------------------------------------
       Check assessment exists
    ------------------------------------------------------- */

    const assessmentRows =
      await query(
        `SELECT id
         FROM assessments
         WHERE id = :assessmentId`,
        {
          assessmentId:
            req.params.id,
        }
      );

    if (!assessmentRows[0]) {
      throw new AppError(
        'Assessment not found',
        404
      );
    }


    /* -------------------------------------------------------
       PREVENT SECOND ATTEMPT
    ------------------------------------------------------- */

    const existingResults =
      await query(
        `SELECT
           id,
           percentage
         FROM assessment_results
         WHERE student_id = :studentId
         AND assessment_id = :assessmentId
         LIMIT 1`,
        {
          studentId: p.id,

          assessmentId:
            req.params.id,
        }
      );

    if (existingResults[0]) {
      throw new AppError(
        `You have already completed this assessment with a score of ${existingResults[0].percentage}%. Each assessment can only be attempted once.`,
        409
      );
    }


    /* -------------------------------------------------------
       Validate question IDs
    ------------------------------------------------------- */

    const ids =
      body.answers.map(
        (item) =>
          item.question_id
      );


    const uniqueIds =
      new Set(ids);

    if (
      uniqueIds.size !==
      ids.length
    ) {
      throw new AppError(
        'Duplicate questions were submitted',
        400
      );
    }


    /* -------------------------------------------------------
       Get correct answers
    ------------------------------------------------------- */

    const placeholders =
      ids
        .map(
          (_, index) =>
            `:id${index}`
        )
        .join(',');


    const params = {
      assessment_id:
        req.params.id,
    };


    ids.forEach(
      (id, index) => {
        params[`id${index}`] = id;
      }
    );


    const answers =
      await query(
        `SELECT
           id,
           correct_answer
         FROM questions
         WHERE assessment_id = :assessment_id
         AND id IN (${placeholders})`,
        params
      );


    /* -------------------------------------------------------
       Ensure all submitted questions are valid
    ------------------------------------------------------- */

    if (
      answers.length !==
      ids.length
    ) {
      throw new AppError(
        'One or more questions are invalid',
        400
      );
    }


    /* -------------------------------------------------------
       Calculate score
    ------------------------------------------------------- */

    const correct =
      new Map(
        answers.map(
          (item) => [
            Number(item.id),
            item.correct_answer,
          ]
        )
      );


    const score =
      body.answers.filter(
        (item) =>
          correct.get(
            Number(
              item.question_id
            )
          ) === item.answer
      ).length;


    const percentage =
      Math.round(
        (score /
          body.answers.length) *
          100
      );


    /* -------------------------------------------------------
       Save result
    ------------------------------------------------------- */

    const result =
      await query(
        `INSERT INTO assessment_results
         (
           student_id,
           assessment_id,
           score,
           percentage
         )
         VALUES
         (
           :student_id,
           :assessment_id,
           :score,
           :percentage
         )`,
        {
          student_id:
            p.id,

          assessment_id:
            req.params.id,

          score,

          percentage,
        }
      );


    /* -------------------------------------------------------
       Return result
    ------------------------------------------------------- */

    ok(
      res,
      {
        id:
          result.insertId,

        assessment_id:
          Number(
            req.params.id
          ),

        score,

        total:
          body.answers.length,

        percentage,

        message:
          'Assessment completed successfully',
      },
      201
    );
  })
);


export default router;