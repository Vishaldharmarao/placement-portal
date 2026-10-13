import assert from 'node:assert/strict';
import test from 'node:test';
import { errorHandler } from '../src/middleware/error.js';
import { AppError } from '../src/utils/http.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('returns structured validation errors as HTTP 400', () => {
  const response = responseRecorder();
  errorHandler({
    name: 'ZodError',
    issues: [{ path: ['password'], message: 'Too short' }],
  }, { method: 'POST', path: '/api/auth/register' }, response);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    message: 'Validation failed',
    errors: [{ field: 'password', message: 'Too short' }],
  });
});

test('maps duplicate records to HTTP 409', () => {
  const response = responseRecorder();
  errorHandler({ code: 'ER_DUP_ENTRY', message: 'private database detail' }, {}, response);

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, {
    success: false,
    message: 'A record with this value already exists',
  });
});

test('does not expose unexpected server errors', () => {
  const response = responseRecorder();
  const previousError = console.error;
  console.error = () => {};

  try {
    errorHandler({ name: 'Error', message: 'private database detail' }, {
      method: 'GET',
      path: '/api/private',
    }, response);
  } finally {
    console.error = previousError;
  }

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    success: false,
    message: 'Internal server error',
  });
});

test('preserves explicit service-unavailable errors', () => {
  const response = responseRecorder();
  errorHandler(new AppError('Interview service unavailable', 503), {
    method: 'POST',
    path: '/api/interview/recommendations',
  }, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    success: false,
    message: 'Interview service unavailable',
  });
});