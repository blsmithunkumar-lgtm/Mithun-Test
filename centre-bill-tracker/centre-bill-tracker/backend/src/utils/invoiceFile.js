const ALLOWED_INVOICE_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
]);

function validateInvoiceFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) return 'Choose a PDF or image file to upload.';
  if (!ALLOWED_INVOICE_TYPES.has(file.mimetype)) return 'Only PDF, JPG, PNG, or WEBP invoices are supported.';
  const bytes = file.buffer;
  const valid = file.mimetype === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : file.mimetype === 'image/jpeg' ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : bytes.length >= 12 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return valid ? null : 'The uploaded file content does not match its file type.';
}

module.exports = { ALLOWED_INVOICE_TYPES, validateInvoiceFile };
