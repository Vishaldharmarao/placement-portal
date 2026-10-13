import { query } from '../config/db.js';
import { AppError } from '../utils/http.js';
import { evaluateCareerReadiness } from '../utils/prediction.js';

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resumeEvidenceFrom(analysis) {
  if (!analysis) return null;
  return [
    ['skills', analysis.extracted_skills],
    ['education', analysis.education],
    ['experience', analysis.experience],
    ['projects', analysis.projects],
    ['certifications', analysis.certifications],
  ]
    .filter(([, value]) => parseJsonArray(value).length > 0)
    .map(([category]) => category);
}

export async function getCareerReadiness(userId, executeQuery = query) {
  const profileRows = await executeQuery(
    'SELECT id, cgpa FROM student_profiles WHERE user_id = :userId',
    { userId }
  );
  if (!profileRows[0]) throw new AppError('Student profile not found', 404);

  const profile = profileRows[0];
  const [skills, projects, internships, certifications, resumeAnalyses] = await Promise.all([
    executeQuery(
      'SELECT s.name FROM student_skills ss JOIN skills s ON s.id = ss.skill_id WHERE ss.student_id = :studentId',
      { studentId: profile.id }
    ),
    executeQuery('SELECT COUNT(*) AS count FROM projects WHERE student_id = :studentId', { studentId: profile.id }),
    executeQuery('SELECT COUNT(*) AS count FROM internships WHERE student_id = :studentId', { studentId: profile.id }),
    executeQuery('SELECT COUNT(*) AS count FROM certifications WHERE student_id = :studentId', { studentId: profile.id }),
    executeQuery(
      `SELECT ra.extracted_skills, ra.education, ra.experience, ra.projects, ra.certifications
       FROM resumes r
       JOIN resume_analysis ra ON ra.resume_id = r.id
       WHERE r.student_id = :studentId
       ORDER BY ra.analyzed_at DESC
       LIMIT 1`,
      { studentId: profile.id }
    ),
  ]);

  return evaluateCareerReadiness({
    cgpa: profile.cgpa == null ? null : Number(profile.cgpa),
    skills: skills.map((skill) => skill.name),
    projectCount: projects[0]?.count == null ? null : Number(projects[0].count),
    internshipCount: internships[0]?.count == null ? null : Number(internships[0].count),
    certificationCount: certifications[0]?.count == null ? null : Number(certifications[0].count),
    resumeEvidence: resumeEvidenceFrom(resumeAnalyses[0]),
  });
}