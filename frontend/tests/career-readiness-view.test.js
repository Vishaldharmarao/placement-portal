import assert from 'node:assert/strict';
import test from 'node:test';
import { getCareerReadinessDisplay } from '../src/career-readiness-view.js';

test('dashboard maps the backend readiness score and status without recalculation', () => {
  const view = getCareerReadinessDisplay({
    method: 'RULE_BASED_READINESS',
    status: 'CAREER_READY',
    label: 'Career Ready',
    readiness_score: 94,
    explanation: 'Rule-based status.',
    factors: [{ key: 'cgpa', points: 25, maximum: 25, evidence: '8.4 / 10' }],
  });

  assert.equal(view.scoreText, '94%');
  assert.equal(view.statusLabel, 'Career Ready');
  assert.equal(view.factors[0].points, 25);
});

test('dashboard displays unavailable for incomplete readiness data', () => {
  const view = getCareerReadinessDisplay({
    method: 'RULE_BASED_READINESS',
    status: 'UNAVAILABLE',
    readiness_score: null,
    explanation: 'Add CGPA and analyze a resume.',
    missing_information: ['CGPA', 'Resume evidence'],
  });

  assert.equal(view.scoreText, 'Unavailable');
  assert.equal(view.statusLabel, 'Complete your profile');
  assert.deepEqual(view.missingInformation, ['CGPA', 'Resume evidence']);
});

test('dashboard displays unavailable rather than zero when the API fails', () => {
  const view = getCareerReadinessDisplay(null, 'Dashboard API failed');

  assert.equal(view.scoreText, 'Unavailable');
  assert.equal(view.statusLabel, 'Unavailable');
  assert.equal(view.explanation, 'Dashboard API failed');
});

test('dashboard rejects invalid or non-rule-based values rather than showing zero', () => {
  const view = getCareerReadinessDisplay({
    method: 'RULE_BASED_READINESS',
    status: 'CAREER_READY',
    label: 'Career Ready',
    readiness_score: NaN,
  });

  assert.equal(view.scoreText, 'Unavailable');
  assert.equal(view.statusLabel, 'Unavailable');
});