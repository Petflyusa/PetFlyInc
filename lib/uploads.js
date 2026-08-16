const fs = require('fs');
const os = require('os');
const path = require('path');

function isWithinDirectory(directory, target) {
  const relative = path.relative(directory, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function resolveUploadStorage({ appDir, configuredDir, nodeEnv, homeDir = os.homedir() }) {
  const legacyUploadDir = path.join(appDir, 'public', 'uploads');
  const configuredUploadDir = configuredDir
    ? (path.isAbsolute(configuredDir) ? path.normalize(configuredDir) : path.resolve(appDir, configuredDir))
    : null;
  const production = nodeEnv === 'production';
  const configuredDirIsInDeployment = configuredUploadDir && isWithinDirectory(appDir, configuredUploadDir);
  const usingProductionFallback = production && (!configuredUploadDir || configuredDirIsInDeployment);

  return {
    uploadDir: usingProductionFallback
      ? path.join(homeDir, 'petflyinc-uploads')
      : (configuredUploadDir || legacyUploadDir),
    legacyUploadDir,
    usingProductionFallback
  };
}

function ensureUploadStorage(storage) {
  fs.mkdirSync(storage.uploadDir, { recursive: true });
  if (path.resolve(storage.uploadDir) === path.resolve(storage.legacyUploadDir) || !fs.existsSync(storage.legacyUploadDir)) return;

  // Preserve files from the prior deploy-folder location during the first safe startup.
  fs.cpSync(storage.legacyUploadDir, storage.uploadDir, { recursive: true, force: false, errorOnExist: false });
}

function uploadFilePath(uploadDir, fileUrl) {
  const value = String(fileUrl || '');
  if (!value.startsWith('/uploads/')) return null;
  const resolved = path.resolve(uploadDir, value.slice('/uploads/'.length));
  return isWithinDirectory(uploadDir, resolved) ? resolved : null;
}

module.exports = { ensureUploadStorage, resolveUploadStorage, uploadFilePath };
