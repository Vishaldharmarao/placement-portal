import assert from 'node:assert/strict';
import test from 'node:test';
import { getCareerReadiness } from '../src/services/career-readiness.js';

function queryStub({ cgpa = 8.4, skills = ['Python', 'SQL', 'React', 'Git', 'AWS'], projectCount = 2, internshipCount = 1, certificationCount = 2, resume = true } = {}) {
  const statements = [];
  const execute = async (sql) => {
    statements.push(sql);
    if (sql.includes('FROM student_profiles')) return [{ id: 17, cgpa }];
    if (sql.includes('FROM student_skills')) return skills.map((name) => ({ name }));
    if (sql.includes('FROM projects')) return [{ count: projectCount }];
    if (sql.includes('FROM internships')) return [{ count: internshipCount }];
    if (sql.includes('FROM certifications')) return [{ count: certificationCount }];
    if (sql.includes('FROM resumes')) {
      return resume ? [{
        extracted_skills: JSON.stringify(['Python']),
        education: JSON.stringify(['Bachelor degree']),
        experience: JSON.stringify([]),
        projects: JSON.stringify([]),
        certifications: JSON.stringify([]),
      }] : [];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  return { execute, statements };
}

test('shared dashboard and Placement Signal service returns the rubric score from profile evidence', async () => {
  const db = queryStub();
  const result = await getCareerReadiness(42, db.execute);

  assert.equal(result.method, 'RULE_BASED_READINESS');
  assert.equal(result.readiness_score, 94);
  assert.equal(result.status, 'CAREER_READY');
  assert.equal(result.label, 'Career Ready');
  assert.ok(result.factors.some((factor) => factor.key === 'resumeEvidence'));
  assert.doesNotMatch(db.statements.join('\n'), /assessment_results|placement_predictions|communication_score|interview_score/i);
});

test('shared readiness service reports missing profile evidence instead of zero', async () => {
  const db = queryStub({ cgpa: null, skills: [], projectCount: 0, internshipCount: 0, certificationCount: 0, resume: false });
  const result = await getCareerReadiness(42, db.execute);

  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.readiness_score, null);
  assert.deepEqual(result.missing_information, ['CGPA', 'Resume evidence']);
});

test('shared readiness service propagates database failures', async () => {
  await assert.rejects(
    getCareerReadiness(42, async () => { throw new Error('database unavailable'); }),
    /database unavailable/
  );
});