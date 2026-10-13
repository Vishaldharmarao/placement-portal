export function hasPdfSignature(contents) {
  return Buffer.isBuffer(contents)
    && contents.length >= 5
    && contents.subarray(0, 5).toString('ascii') === '%PDF-';
}