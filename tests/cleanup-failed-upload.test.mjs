import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupFailedUpload } from '../lib/cleanup-failed-upload.ts';

function client(remove) { return { storage: { from(bucket) { assert.equal(bucket, 'studio-files'); return { remove }; } } }; }
test('cleans only the failed upload path', async () => {
  const db = client(async paths => { assert.deepEqual(paths, ['1/direct/user/file']); return { data: [{ name: paths[0] }], error: null }; });
  assert.equal(await cleanupFailedUpload(db, '1/direct/user/file'), true);
});
test('does not claim cleanup when the policy preserves a committed submission', async () => {
  assert.equal(await cleanupFailedUpload(client(async () => ({ data: [], error: null })), 'file'), false);
});
test('keeps the upload failure recoverable when cleanup is denied or offline', async () => {
  assert.equal(await cleanupFailedUpload(client(async () => ({ data: null, error: new Error('denied') })), 'file'), false);
  assert.equal(await cleanupFailedUpload(client(async () => { throw new Error('offline'); }), 'file'), false);
});
