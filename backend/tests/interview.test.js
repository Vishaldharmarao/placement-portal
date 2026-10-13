import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateInterviewAnswer } from '../src/utils/interview.js';

test('scores answer coverage transparently against rubric concepts', () => {
  const result = evaluateInterviewAnswer(
    'I owned the project design, explained the technical decisions and measured the outcome.',
    ['design', 'technical decisions', 'outcome']
  );

  assert.equal(result.score, 100);
  assert.deepEqual(result.missing_concepts, []);
});

test('reports missing concepts without claiming an AI assessment', () => {
  const result = evaluateInterviewAnswer(
    'I contributed to the project and helped deliver a result.',
    ['contribution', 'trade-offs', 'impact']
  );

  assert.equal(result.score, 0);
  assert.deepEqual(result.missing_concepts, ['contribution', 'trade-offs', 'impact']);
  assert.match(result.feedback, /Rubric coverage/);
});