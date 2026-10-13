import { Router } from 'express';
import { query } from '../config/db.js';
import { AppError, asyncRoute, ok } from '../utils/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getCareerReadiness } from '../services/career-readiness.js';

const router = Router();

router.get(
	'/',
	requireAuth,
	requireRole('STUDENT'),
	asyncRoute(async (req, res) => {
		const profiles = await query(
			'SELECT * FROM student_profiles WHERE user_id = :id',
			{ id: req.user.id }
		);
		if (!profiles[0]) throw new AppError('Student profile not found', 404);
		const profile = profiles[0];

		const [applications, shortlisted, ats, assessment, careerReadiness] = await Promise.all([
			query('SELECT COUNT(*) AS count FROM job_applications WHERE student_id = :id', { id: profile.id }),
			query("SELECT COUNT(*) AS count FROM job_applications WHERE student_id = :id AND status IN ('SHORTLISTED','INTERVIEW')", { id: profile.id }),
			query('SELECT ra.ats_score FROM resumes r JOIN resume_analysis ra ON ra.resume_id = r.id WHERE r.student_id = :id ORDER BY ra.analyzed_at DESC LIMIT 1', { id: profile.id }),
			query('SELECT AVG(percentage) AS score FROM assessment_results WHERE student_id = :id', { id: profile.id }),
			getCareerReadiness(req.user.id),
		]);

		const completionFields = [
			'roll_number', 'branch', 'cgpa', 'graduation_year',
			'location', 'github_url', 'linkedin_url', 'portfolio_url',
		];
		const completion = completionFields.filter((field) => profile[field]).length / completionFields.length;

		ok(res, {
			profile_completion: Math.round(completion * 100),
			career_readiness: careerReadiness,
			ats_score: ats[0]?.ats_score ?? null,
			recommended_jobs: 0,
			applications: applications[0].count,
			shortlisted: shortlisted[0].count,
			assessment_score: assessment[0].score ?? null,
		});
	})
);

export default router;
