const fs = require('fs');
const path = require('path');

function resolveRepoRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function resolveOpenClawRoot(env = process.env) {
  if (env.OPENCLAW_HOME) {
    return path.resolve(env.OPENCLAW_HOME);
  }

  const home = env.HOME || env.USERPROFILE;
  return home ? path.join(home, '.openclaw') : path.join(process.cwd(), '.openclaw');
}

function resolveCorePackageRoot(env = process.env) {
  if (env.LIFECOACH_CORE_ROOT) {
    return path.resolve(env.LIFECOACH_CORE_ROOT);
  }

  return path.join(resolveRepoRoot(), 'packages', 'lifecoach-core');
}

function resolveWorkspacePackageRoot(env = process.env) {
  if (env.LIFECOACH_WORKSPACE_PACKAGE_ROOT) {
    return path.resolve(env.LIFECOACH_WORKSPACE_PACKAGE_ROOT);
  }

  return path.join(resolveRepoRoot(), 'packages', 'lifecoach-workspace');
}

function resolveInstallerPackageRoot(env = process.env) {
  if (env.LIFECOACH_INSTALLER_ROOT) {
    return path.resolve(env.LIFECOACH_INSTALLER_ROOT);
  }

  return path.join(resolveRepoRoot(), 'packages', 'lifecoach-installer');
}

function resolvePackageRoot(env = process.env) {
  if (env.LIFECOACH_PACKAGE_ROOT) {
    return path.resolve(env.LIFECOACH_PACKAGE_ROOT);
  }

  const openclawRoot = resolveOpenClawRoot(env);
  const installedRoot = path.join(openclawRoot, 'app', 'lifecoach');
  return fs.existsSync(installedRoot) ? installedRoot : null;
}

function resolveRuntimeRoot(env = process.env) {
  if (env.LIFECOACH_RUNTIME_ROOT) {
    return path.resolve(env.LIFECOACH_RUNTIME_ROOT);
  }

  const packageRoot = resolvePackageRoot(env);
  if (packageRoot) {
    const installedRuntime = path.join(packageRoot, 'runtime');
    if (fs.existsSync(installedRuntime)) {
      return installedRuntime;
    }
  }

  return path.join(resolveCorePackageRoot(env), 'src');
}

function resolveWorkspaceRoot(env = process.env, override) {
  if (override) return override;
  if (env.LIFECOACH_WORKSPACE_ROOT) {
    return env.LIFECOACH_WORKSPACE_ROOT;
  }

  const openclawRoot = resolveOpenClawRoot(env);
  const installedWorkspace = path.join(openclawRoot, 'workspace');
  if (fs.existsSync(installedWorkspace)) {
    return installedWorkspace;
  }

  return path.join(resolveWorkspacePackageRoot(env), 'content');
}

function resolveConfigRoot(env = process.env) {
  if (env.LIFECOACH_CONFIG_ROOT) {
    return path.resolve(env.LIFECOACH_CONFIG_ROOT);
  }

  const packageRoot = resolvePackageRoot(env);
  if (packageRoot) {
    const installedConfig = path.join(packageRoot, 'config');
    if (fs.existsSync(installedConfig)) {
      return installedConfig;
    }
  }

  return path.join(resolveInstallerPackageRoot(env), 'config');
}

function resolveSchemaRoot(env = process.env) {
  if (env.LIFECOACH_SCHEMA_ROOT) {
    return path.resolve(env.LIFECOACH_SCHEMA_ROOT);
  }

  const packageRoot = resolvePackageRoot(env);
  if (packageRoot) {
    const installedSchema = path.join(packageRoot, 'schemas');
    if (fs.existsSync(installedSchema)) {
      return installedSchema;
    }
  }

  return path.join(resolveCorePackageRoot(env), 'schemas');
}

function resolveStateRoot(env = process.env) {
  if (env.LIFECOACH_STATE_ROOT) {
    return path.resolve(env.LIFECOACH_STATE_ROOT);
  }

  const openclawRoot = resolveOpenClawRoot(env);
  return path.join(openclawRoot, 'state', 'lifecoach');
}

function resolveStateDirectories(env = process.env) {
  const root = resolveStateRoot(env);
  return {
    root,
    eventsDir: path.join(root, 'events'),
    timelineDir: path.join(root, 'timeline'),
    reviewsDir: path.join(root, 'reviews'),
    memoryCacheDir: path.join(root, 'memory-cache'),
    proposalsDir: path.join(root, 'proposals'),
    systemReviewsDir: path.join(root, 'system-reviews'),
  };
}

function resolveWorkspaceManifestPath(env = process.env, override) {
  return path.join(resolveWorkspaceRoot(env, override), '.lifecoach', 'workspace.manifest.json');
}

function resolveSelftestFixtureRoot(env = process.env) {
  if (env.LIFECOACH_SELFTEST_FIXTURES_ROOT) {
    return path.resolve(env.LIFECOACH_SELFTEST_FIXTURES_ROOT);
  }

  const installedRuntime = resolveRuntimeRoot(env);
  const installedFixtures = path.join(installedRuntime, 'tests', 'fixtures');
  if (fs.existsSync(installedFixtures)) {
    return installedFixtures;
  }

  return path.join(resolveCorePackageRoot(env), 'tests', 'fixtures');
}

module.exports = {
  resolveRepoRoot,
  resolveCorePackageRoot,
  resolveWorkspacePackageRoot,
  resolveInstallerPackageRoot,
  resolveOpenClawRoot,
  resolvePackageRoot,
  resolveRuntimeRoot,
  resolveWorkspaceRoot,
  resolveConfigRoot,
  resolveSchemaRoot,
  resolveStateRoot,
  resolveStateDirectories,
  resolveWorkspaceManifestPath,
  resolveSelftestFixtureRoot,
};
