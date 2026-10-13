import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPdfSignature } from '../src/utils/files.js';

test('accepts a PDF signature', () => {
  assert.equal(hasPdfSignature(Buffer.from('%PDF-1.7\n')), true);
});

test('rejects non-PDF and truncated content', () => {
  assert.equal(hasPdfSignature(Buffer.from('not a PDF')), false);
  assert.equal(hasPdfSignature(Buffer.from('%PDF')), false);
  assert.equal(hasPdfSignature('not a buffer'), false);
});