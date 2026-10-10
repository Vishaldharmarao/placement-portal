import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import axios from 'axios';

import { env } from '../config/env.js';
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
// Upload directory
// =========================================================

const dir = path.resolve('uploads');

fs.mkdirSync(dir, {
  recursive: true
});


// =========================================================
// Multer
// =========================================================

const upload = multer({
  dest: dir,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    cb(
      null,
      file.mimetype === 'application/pdf'
    );
  }
});


// =========================================================
// Student profile helper
// =========================================================

const profile = async (userId) => {

  const rows = await query(
    `
    SELECT id
    FROM student_profiles
    WHERE user_id = :id
    `,
    {
      id: userId
    }
  );

  if (!rows[0]) {
    throw new AppError(
      'Profile not found',
      404
    );
  }

  return rows[0];
};


// =========================================================
// Normalize skill name
// =========================================================

function normalizeSkill(value) {

  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/nodejs/g, 'node.js');

}


// =========================================================
// Save AI extracted skills into student_skills
// =========================================================

const syncExtractedSkills = async (
  studentId,
  extractedSkills
) => {

  if (!Array.isArray(extractedSkills)) {
    return;
  }


  for (const rawSkill of extractedSkills) {

    const skillName =
      String(rawSkill || '').trim();

    if (!skillName) {
      continue;
    }


    const normalized =
      normalizeSkill(skillName);


    // Get the existing skill from master table.
    const skillRows = await query(
      `
      SELECT id, name
      FROM skills
      `,
      {}
    );


    const skill =
      skillRows.find(
        (item) =>
          normalizeSkill(item.name) === normalized
      );


    // Skill isn't present in the master table.
    // We skip it instead of creating an invalid
    // database record.
    if (!skill) {
      console.warn(
        `Skill not found in skills table: ${skillName}`
      );

      continue;
    }


    // Save the skill for this student.
    await query(
      `
      INSERT INTO student_skills
      (
        student_id,
        skill_id,
        proficiency_level
      )
      VALUES
      (
        :student_id,
        :skill_id,
        :proficiency_level
      )
      ON DUPLICATE KEY UPDATE
        proficiency_level =
          VALUES(proficiency_level)
      `,
      {
        student_id: studentId,
        skill_id: skill.id,
        proficiency_level: 'INTERMEDIATE'
      }
    );

  }

};


// =========================================================
// Upload resume
// =========================================================

router.post(
  '/upload',

  requireAuth,

  requireRole('STUDENT'),

  upload.single('resume'),

  asyncRoute(async (req, res) => {

    if (!req.file) {

      throw new AppError(
        'Upload a PDF resume (maximum 5 MB)',
        400
      );

    }


    const student =
      await profile(req.user.id);


    const result =
      await query(
        `
        INSERT INTO resumes
        (
          student_id,
          file_name,
          file_path
        )
        VALUES
        (
          :student_id,
          :file_name,
          :file_path
        )
        `,
        {
          student_id:
            student.id,

          file_name:
            req.file.originalname,

          file_path:
            req.file.path
        }
      );


    ok(
      res,
      {
        id: result.insertId,
        file_name:
          req.file.originalname
      },
      201
    );

  })
);


// =========================================================
// Get resumes
// =========================================================

router.get(
  '/',

  requireAuth,

  requireRole('STUDENT'),

  asyncRoute(async (req, res) => {

    const student =
      await profile(req.user.id);


    const rows =
      await query(
        `
        SELECT
          r.id,
          r.file_name,
          r.uploaded_at,
          ra.ats_score,
          ra.extracted_skills,
          ra.missing_skills,
          ra.recommendations
        FROM resumes r
        LEFT JOIN resume_analysis ra
          ON ra.resume_id = r.id
        WHERE r.student_id = :id
        ORDER BY r.uploaded_at DESC
        `,
        {
          id: student.id
        }
      );


    ok(res, rows);

  })
);


// =========================================================
// Analyze resume
// =========================================================

router.post(
  '/:id/analyze',

  requireAuth,

  requireRole('STUDENT'),

  asyncRoute(async (req, res) => {

    const student =
      await profile(req.user.id);


    const rows =
      await query(
        `
        SELECT *
        FROM resumes
        WHERE
          id = :id
          AND student_id = :student_id
        `,
        {
          id: req.params.id,
          student_id: student.id
        }
      );


    if (!rows[0]) {

      throw new AppError(
        'Resume not found',
        404
      );

    }


    const resume = rows[0];


    // -----------------------------------------------------
    // Verify physical file exists
    // -----------------------------------------------------

    if (
      !resume.file_path ||
      !fs.existsSync(resume.file_path)
    ) {

      throw new AppError(
        'Resume file is missing. Please upload the resume again.',
        404
      );

    }


    // -----------------------------------------------------
    // Send PDF to AI service
    // -----------------------------------------------------

    const form = new FormData();

    const fileBuffer =
      fs.readFileSync(
        resume.file_path
      );


    form.append(
      'file',
      new Blob(
        [
          fileBuffer
        ],
        {
          type:
            'application/pdf'
        }
      ),
      resume.file_name
    );


    const { data } =
      await axios.post(
        `${env.aiUrl}/analyze-resume`,
        form,
        {
          timeout: 30000
        }
      );


    // -----------------------------------------------------
    // Save extracted text
    // -----------------------------------------------------

    await query(
      `
      UPDATE resumes
      SET extracted_text = :text
      WHERE id = :id
      `,
      {
        text:
          data.extracted_text || '',

        id:
          resume.id
      }
    );


    // -----------------------------------------------------
    // Save AI analysis
    // -----------------------------------------------------

    await query(
      `
      INSERT INTO resume_analysis
      (
        resume_id,
        extracted_skills,
        education,
        experience,
        projects,
        certifications,
        ats_score,
        score_breakdown,
        missing_skills,
        recommendations
      )
      VALUES
      (
        :resume_id,
        :skills,
        :education,
        :experience,
        :projects,
        :certifications,
        :ats_score,
        :breakdown,
        :missing,
        :recommendations
      )

      ON DUPLICATE KEY UPDATE

        extracted_skills =
          VALUES(extracted_skills),

        education =
          VALUES(education),

        experience =
          VALUES(experience),

        projects =
          VALUES(projects),

        certifications =
          VALUES(certifications),

        ats_score =
          VALUES(ats_score),

        score_breakdown =
          VALUES(score_breakdown),

        missing_skills =
          VALUES(missing_skills),

        recommendations =
          VALUES(recommendations),

        analyzed_at =
          CURRENT_TIMESTAMP
      `,
      {
        resume_id:
          resume.id,

        skills:
          JSON.stringify(
            data.skills || []
          ),

        education:
          JSON.stringify(
            data.education || []
          ),

        experience:
          JSON.stringify(
            data.experience || []
          ),

        projects:
          JSON.stringify(
            data.projects || []
          ),

        certifications:
          JSON.stringify(
            data.certifications || []
          ),

        ats_score:
          data.ats_score || 0,

        breakdown:
          JSON.stringify(
            data.score_breakdown || {}
          ),

        missing:
          JSON.stringify(
            data.missing_skills || []
          ),

        recommendations:
          JSON.stringify(
            data.recommendations || []
          )
      }
    );


    // -----------------------------------------------------
    // NEW:
    // Sync extracted skills into student_skills
    // -----------------------------------------------------

    await syncExtractedSkills(
      student.id,
      data.skills || []
    );


    // -----------------------------------------------------
    // Return AI result
    // -----------------------------------------------------

    ok(
      res,
      data
    );

  })
);


export default router;