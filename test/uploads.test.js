const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const fs = require('node:fs');
const os = require('node:os');
const { ensureUploadStorage, resolveUploadStorage, uploadFilePath } = require('../lib/uploads');

const appDir = path.join(path.sep, 'srv', 'petflyinc');

test('production redirects a repository upload directory to persistent storage', () => {
  const storage = resolveUploadStorage({
    appDir,
    homeDir: path.join(path.sep, 'home', 'petfly'),
    nodeEnv: 'production',
    configuredDir: './public/uploads'
  });

  assert.equal(storage.uploadDir, path.join(path.sep, 'home', 'petfly', 'petflyinc-uploads'));
  assert.equal(storage.usingProductionFallback, true);
});

test('production preserves an explicitly configured directory outside the deployment', () => {
  const storage = resolveUploadStorage({
    appDir,
    homeDir: path.join(path.sep, 'home', 'petfly'),
    nodeEnv: 'production',
    configuredDir: path.join(path.sep, 'data', 'petfly-uploads')
  });

  assert.equal(storage.uploadDir, path.join(path.sep, 'data', 'petfly-uploads'));
  assert.equal(storage.usingProductionFallback, false);
});

test('development keeps the configured local upload directory', () => {
  const storage = resolveUploadStorage({
    appDir,
    homeDir: path.join(path.sep, 'home', 'petfly'),
    nodeEnv: 'development',
    configuredDir: './public/uploads'
  });

  assert.equal(storage.uploadDir, path.join(appDir, 'public', 'uploads'));
  assert.equal(storage.usingProductionFallback, false);
});

test('moves legacy deployment uploads into persistent storage', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'petfly-uploads-'));
  const appDirectory = path.join(temporaryRoot, 'app');
  const legacyDirectory = path.join(appDirectory, 'public', 'uploads');
  const persistentHome = path.join(temporaryRoot, 'home');
  fs.mkdirSync(path.join(legacyDirectory, 'pets'), { recursive: true });
  fs.writeFileSync(path.join(legacyDirectory, 'pets', 'saved-photo.jpg'), 'pet photo');

  const storage = resolveUploadStorage({ appDir: appDirectory, homeDir: persistentHome, nodeEnv: 'production' });
  ensureUploadStorage(storage);

  assert.equal(fs.readFileSync(path.join(storage.uploadDir, 'pets', 'saved-photo.jpg'), 'utf8'), 'pet photo');
  assert.equal(uploadFilePath(storage.uploadDir, '/uploads/pets/saved-photo.jpg'), path.join(storage.uploadDir, 'pets', 'saved-photo.jpg'));
  assert.equal(uploadFilePath(storage.uploadDir, '/uploads/../../etc/passwd'), null);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

test('database upload migration is included in startup migration list', () => {
  const database = fs.readFileSync(path.join(__dirname, '..', 'lib', 'petconnect-database.js'), 'utf8');
  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '009_uploaded_files.sql'), 'utf8');
  assert.match(database, /009_uploaded_files\.sql/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS uploaded_files/i);
  assert.match(migration, /file_data LONGBLOB NOT NULL/i);
});
