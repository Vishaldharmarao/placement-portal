import assert from 'node:assert/strict';
import test from 'node:test';
import { withTransaction } from '../src/config/db.js';

test('rolls back and releases the connection when account setup fails', async () => {
  const events = [];
  const connection = {
    beginTransaction: async () => events.push('begin'),
    execute: async (sql) => {
      events.push(sql);
      if (sql.includes('student_profiles')) {
        throw new Error('profile insert failed');
      }
      return [{ insertId: 17 }, []];
    },
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  };

  await assert.rejects(
    withTransaction(async (transaction) => {
      await transaction.execute('INSERT INTO users');
      await transaction.execute('INSERT INTO student_profiles');
    }, async () => connection),
    /profile insert failed/
  );

  assert.deepEqual(events, [
    'begin',
    'INSERT INTO users',
    'INSERT INTO student_profiles',
    'rollback',
    'release',
  ]);
});

test('commits successful work and releases the connection', async () => {
  const events = [];
  const connection = {
    beginTransaction: async () => events.push('begin'),
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  };

  const result = await withTransaction(
    async () => 'created',
    async () => connection
  );

  assert.equal(result, 'created');
  assert.deepEqual(events, ['begin', 'commit', 'release']);
});