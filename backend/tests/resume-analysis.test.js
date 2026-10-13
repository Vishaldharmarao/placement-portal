import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteOwnedResumeAnalysis } from '../src/utils/resume-analysis.js';

test('deletes only the selected analysis through a student-owned resume', async () => {
  let sql;
  let parameters;
  const result = await deleteOwnedResumeAnalysis({
    analysisId: '23',
    studentId: 9,
    executeDelete: async (statement, values) => {
      sql = statement;
      parameters = values;
      return { affectedRows: 1 };
    },
  });

  assert.match(sql, /^\s*DELETE FROM resume_analysis/);
  assert.match(sql, /WHERE id = :analysisId/);
  assert.match(sql, /SELECT id FROM resumes WHERE student_id = :studentId/);
  assert.equal(/DELETE FROM (?:resumes|users)/i.test(sql), false);
  assert.deepEqual(parameters, { analysisId: 23, studentId: 9 });
  assert.deepEqual(result, { analysisId: 23 });
});

test('returns not found when the analysis is nonexistent or not owned by the student', async () => {
  let calls = 0;
  await assert.rejects(
    deleteOwnedResumeAnalysis({
      analysisId: 23,
      studentId: 10,
      executeDelete: async () => {
        calls += 1;
        return { affectedRows: 0 };
      },
    }),
    (error) => error.status === 404
  );
  assert.equal(calls, 1);
});

test('validates IDs before issuing SQL', async () => {
  let called = false;
  await assert.rejects(
    deleteOwnedResumeAnalysis({
      analysisId: '1 OR 1=1',
      studentId: 9,
      executeDelete: async () => { called = true; return { affectedRows: 1 }; },
    }),
    (error) => error.status === 400
  );
  assert.equal(called, false);
});

test('does not report success when the database delete fails', async () => {
  const endpoint = async () => {
    const deleted = await deleteOwnedResumeAnalysis({
      analysisId: 23,
      studentId: 9,
      executeDelete: async () => { throw new Error('database unavailable'); },
    });
    return { success: true, data: deleted };
  };

  await assert.rejects(endpoint(), /database unavailable/);
});