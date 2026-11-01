const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInvoiceFile } = require('../src/utils/invoiceFile');

const signatures = {
  'application/pdf': Buffer.from('%PDF-1.7\n'),
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': Buffer.from('RIFF0000WEBP'),
};

test('accepts supported invoice formats with matching signatures', () => {
  for (const [mimetype, buffer] of Object.entries(signatures)) {
    assert.equal(validateInvoiceFile({ mimetype, buffer }), null, mimetype);
  }
});

test('rejects missing file and unsupported MIME type', () => {
  assert.match(validateInvoiceFile(null), /Choose a PDF/);
  assert.match(validateInvoiceFile({ mimetype: 'text/html', buffer: Buffer.from('<html>') }), /Only PDF/);
});

test('rejects MIME and file-signature mismatches', () => {
  assert.match(validateInvoiceFile({ mimetype: 'application/pdf', buffer: signatures['image/png'] }), /does not match/);
  assert.match(validateInvoiceFile({ mimetype: 'image/png', buffer: signatures['image/jpeg'] }), /does not match/);
});

test('rejects non-Buffer file content', () => {
  assert.match(validateInvoiceFile({ mimetype: 'application/pdf', buffer: 'not bytes' }), /Choose a PDF/);
});
