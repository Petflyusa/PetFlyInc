const crypto = require('crypto');
const fs = require('fs');

function databaseFileUrl(storageKey) {
  return `/uploads/db/${storageKey}`;
}

async function persistUploadedFile(connection, file, category) {
  if (!file) return null;
  const data = file.buffer || await fs.promises.readFile(file.path);
  const storageKey = crypto.randomUUID();
  await connection.execute(
    'INSERT INTO uploaded_files (storage_key, category, original_name, mime_type, file_data) VALUES (?,?,?,?,?)',
    [storageKey, category, String(file.originalname || 'upload').slice(0, 255), String(file.mimetype || 'application/octet-stream').slice(0, 127), data]
  );
  if (file.path) await fs.promises.unlink(file.path).catch(() => {});
  return databaseFileUrl(storageKey);
}

function storageKeyFromUrl(fileUrl) {
  const match = /^\/uploads\/db\/([0-9a-f-]{36})$/i.exec(String(fileUrl || ''));
  return match ? match[1] : null;
}

module.exports = { databaseFileUrl, persistUploadedFile, storageKeyFromUrl };
