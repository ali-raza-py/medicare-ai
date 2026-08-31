#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';
function log(msg) { console.error(msg); }
function parseArgs(args) {
  const result = { projectPath: '.', prod: true, yes: false, skipBuild: false };
  for (const arg of args) {
    if (arg === '--prod') result.prod = true;
    else if (arg === '--yes' || arg === '-y') result.yes = true;
    else if (arg === '--skip-build') result.skipBuild = true;
    else if (!arg.startsWith('-')) result.projectPath = arg;
  }
  return result;
}
function detectPackageManager(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm';
  return 'npm';
}
function runBuildIfNeeded(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return true;
  let packageJson;
  try { packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')); } catch { return true; }
  if (!packageJson.scripts || !packageJson.scripts.build) return true;
  log('');
  log('Running pre-deployment build...');
  const pkgManager = detectPackageManager(projectPath);
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('Installing dependencies...');
    const installArgs = pkgManager === 'yarn' ? [] : ['install'];
    const result = spawnSync(pkgManager, installArgs, { cwd: projectPath, stdio: 'inherit', shell: isWindows });
    if (result.status !== 0) { log('Install failed'); process.exit(1); }
  }
  const buildArgs = pkgManager === 'npm' ? ['run', 'build'] : ['build'];
  log(`Executing: ${pkgManager} ${buildArgs.join(' ')}`);
  const result = spawnSync(pkgManager, buildArgs, { cwd: projectPath, stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) { log('Build FAILED!'); process.exit(1); }
  log('Build completed successfully!');
  return true;
}
function doDeploy(projectPath, options) {
  log('');
  log('Starting deployment...');
  const args = [];
  if (options.yes) args.push('--yes');
  if (options.prod) args.push('--prod');
  log(`Environment: ${options.prod ? 'Production' : 'Preview'}`);
  log(`Project: ${path.resolve(projectPath)}`);
  const result = spawnSync('vercel', args, {
    cwd: path.resolve(projectPath),
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    timeout: 300000,
    shell: isWindows,
    env: { ...process.env, PATH: process.env.PATH + (isWindows ? ';C:\\Users\\HP\\AppData\\Roaming\\npm' : '') }
  });
  const output = (result.stdout || '') + (result.stderr || '');
  log(output);
  if (result.status !== 0) { log('Deployment failed'); process.exit(1); }
  const aliasedMatch = output.match(/Aliased:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
  const productionUrl = aliasedMatch ? aliasedMatch[1] : null;
  const deploymentMatch = output.match(/Production:\s*(https:\/\/[a-zA-Z0-9.-]+\.vercel\.app)/i);
  const deploymentUrl = deploymentMatch ? deploymentMatch[1] : null;
  const previewMatch = output.match(/(https:\/\/[a-zA-Z0-9-]+\.vercel\.app)/);
  const previewUrl = previewMatch ? previewMatch[1] : null;
  const finalUrl = productionUrl || deploymentUrl || previewUrl;
  log('');
  log('========================================');
  log('Deployment successful!');
  log('========================================');
  if (finalUrl) {
    log(`Your site is live: ${finalUrl}`);
    console.log(JSON.stringify({ status: 'success', url: finalUrl }));
  } else {
    console.log(JSON.stringify({ status: 'success', message: 'Deployment successful', raw_output: output.slice(-500) }));
  }
}
function main() {
  log('========================================');
  log('Vercel CLI Project Deployment');
  log('========================================');
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const projectPath = path.resolve(options.projectPath);
  if (!fs.existsSync(projectPath)) { log(`Error: ${projectPath} does not exist`); process.exit(1); }
  log(`Project path: ${projectPath}`);
  if (!options.skipBuild) runBuildIfNeeded(projectPath);
  doDeploy(projectPath, options);
}
main();
