function requireRuntimeModule(packagePath, installedPath) {
  try {
    return require(packagePath);
  } catch (error) {
    if (!error || error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
    return require(installedPath);
  }
}

module.exports = {
  requireRuntimeModule,
};
