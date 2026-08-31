#!/usr/bin/env node
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';
const LOG_FILE = path.join(process.cwd(), '.vercel-tmp', 'login.log');
function log(msg) { console.error(msg); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function startBackgroundLogin() {
  const logStream = fs.openSync(LOG_FILE, 'w');
  const env = { ...process.env, PATH: process.env.PATH + (isWindows ? ';C:\\Users\\HP\\AppData\\Roaming\\npm' : '') };
  const child = spawn('vercel', ['login'], { detached: true, stdio: ['ignore', logStream, logStream], shell: isWindows, env });
  child.unref();
  log(`Background login process started (PID: ${child.pid})`);
  fs.writeFileSync(LOG_FILE + '.pid', String(child.pid));
  return child.pid;
}
function openBrowser(url) {
  const urlPattern = /^https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+$/;
  if (!urlPattern.test(url)) { log(`URL does not match expected pattern: ${url}`); return; }
  try {
    if (isWindows) spawnSync('powershell', ['-Command', `Start-Process '${url}'`], { stdio: 'ignore', windowsHide: true });
    else if (os.platform() === 'darwin') spawnSync('open', [url], { stdio: 'ignore' });
    else spawnSync('xdg-open', [url], { stdio: 'ignore' });
    log('Browser opened automatically');
  } catch (e) { log(`Failed to open browser: ${e.message}`); }
}
async function waitForAuthUrl() {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const match = content.match(/https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+(?=\s|$)/);
        if (match) return match[0];
      }
    } catch (e) { /* file may not exist yet */ }
  }
  return null;
}
async function main() {
  log('========================================');
  log('Vercel CLI Login Authorization');
  log('========================================');
  const loginPid = startBackgroundLogin();
  log('Waiting for authorization URL...');
  const authUrl = await waitForAuthUrl();
  if (authUrl) {
    log('');
    log('Authorization URL extracted');
    log(`PID: ${loginPid}`);
    openBrowser(authUrl);
    console.log(JSON.stringify({ status: 'needs_auth', auth_url: authUrl, log_file: LOG_FILE }));
  } else {
    log('Failed to get authorization URL');
    try { log('Log content: ' + fs.readFileSync(LOG_FILE, 'utf8')); } catch (e) {}
    process.exit(1);
  }
}
main();
