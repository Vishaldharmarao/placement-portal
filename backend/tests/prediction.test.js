import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateCareerReadiness,
  RULE_BASED_CRITERIA,
} from '../src/utils/prediction.js';

function strongProfile() {
  return {
    cgpa: 8.4,
    skills: ['Python', 'SQL', 'React', 'Git', 'AWS'],
    projectCount: 2,
    internshipCount: 1,
    certificationCount: 2,
    resumeEvidence: ['skills', 'education', 'projects', 'experience', 'certifications'],
  };
}

test('strong recorded evidence produces Career Ready under documented rules', () => {
  const result = evaluateCareerReadiness(strongProfile());
  assert.equal(result.status, 'CAREER_READY');
  assert.equal(result.label, 'Career Ready');
  assert.equal(result.method, 'RULE_BASED_READINESS');
  assert.match(result.explanation, /not a placement probability/);
  assert.equal(Object.hasOwn(result, 'probability'), false);
});

test('mixed profile evidence produces Developing and actionable factors', () => {
  const result = evaluateCareerReadiness({
    cgpa: 7.3,
    skills: ['Python', 'SQL'],
    projectCount: 1,
    internshipCount: 0,
    certificationCount: 1,
    resumeEvidence: ['skills', 'education'],
  });
  assert.equal(result.status, 'DEVELOPING');
  assert.ok(result.factors.some((factor) => factor.key === 'internships' && factor.points === 0));
  assert.ok(result.recommendations.some((item) => item.includes('internship')));
});

test('limited but recorded evidence produces Needs Improvement, not unavailable', () => {
  const result = evaluateCareerReadiness({
    cgpa: 5.5,
    skills: [],
    projectCount: 0,
    internshipCount: 0,
    certificationCount: 0,
    resumeEvidence: [],
  });
  assert.equal(result.status, 'NEEDS_IMPROVEMENT');
  assert.equal(result.label, 'Needs Improvement');
});

test('missing CGPA and resume evidence are not replaced with zero', () => {
  const result = evaluateCareerReadiness({
    cgpa: null,
    skills: [],
    projectCount: 0,
    internshipCount: 0,
    certificationCount: 0,
    resumeEvidence: null,
  });
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.label, 'Readiness Unavailable');
  assert.deepEqual(result.missing_information, ['CGPA', 'Resume evidence']);
  assert.match(result.explanation, /Insufficient profile information/);
});

test('missing saved counts reduce coverage rather than defaulting to zero', () => {
  const result = evaluateCareerReadiness({
    cgpa: 8,
    skills: ['Python'],
    projectCount: null,
    internshipCount: null,
    certificationCount: null,
    resumeEvidence: ['skills'],
  });
  assert.deepEqual(result.missing_information, [
    'Project records',
    'Internship records',
    'Certification records',
  ]);
  assert.equal(result.status, 'UNAVAILABLE');
});

test('criteria thresholds are configurable without changing scoring logic', () => {
  const customCriteria = {
    ...RULE_BASED_CRITERIA,
    statusThresholds: {
      ...RULE_BASED_CRITERIA.statusThresholds,
      careerReadyFrom: 101,
    },
  };
  const result = evaluateCareerReadiness(strongProfile(), customCriteria);
  assert.equal(result.status, 'DEVELOPING');
  assert.equal(result.criteria_version, RULE_BASED_CRITERIA.version);
});