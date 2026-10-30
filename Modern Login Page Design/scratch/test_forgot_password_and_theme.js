const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(pathName, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING FORGOT PASSWORD & LANDING THEME TOGGLE    ');
  console.log('====================================================\n');

  let passed = 0;
  function pass(msg) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  }

  // --- 1. Frontend File Verifications ---
  console.log('--- 1. Frontend File Integrity Checks ---');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert(indexHtml.includes('id="forgot-password-link"'), 'index.html missing #forgot-password-link');
  pass('index.html contains #forgot-password-link');

  assert(indexHtml.includes('id="reset-form"'), 'index.html missing #reset-form');
  pass('index.html contains #reset-form');

  assert(indexHtml.includes('id="back-to-signin-link"'), 'index.html missing #back-to-signin-link');
  pass('index.html contains #back-to-signin-link');

  assert(indexHtml.includes('id="themeToggleBtn"'), 'index.html missing #themeToggleBtn');
  pass('index.html contains #themeToggleBtn');

  const landingHtml = fs.readFileSync(path.join(__dirname, '../landing.html'), 'utf8');
  assert(landingHtml.includes('id="themeToggleBtn"'), 'landing.html missing #themeToggleBtn');
  pass('landing.html contains #themeToggleBtn in navigation');

  const landingJs = fs.readFileSync(path.join(__dirname, '../landing-script.js'), 'utf8');
  assert(landingJs.includes('setupTheme'), 'landing-script.js missing setupTheme');
  assert(landingJs.includes('applyTheme'), 'landing-script.js missing applyTheme');
  pass('landing-script.js has theme toggling logic and localStorage synchronization');

  const landingCss = fs.readFileSync(path.join(__dirname, '../landing-style.css'), 'utf8');
  assert(landingCss.includes('[data-theme="dark"]'), 'landing-style.css missing dark theme styles');
  assert(landingCss.includes('.theme-toggle-btn'), 'landing-style.css missing theme-toggle-btn styles');
  pass('landing-style.css supports dark theme and theme-toggle-btn');

  const authCss = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
  assert(authCss.includes('.hidden-form'), 'style.css missing hidden-form class');
  assert(authCss.includes('[data-theme="dark"]'), 'style.css missing dark theme styles');
  pass('style.css supports .hidden-form and dark theme');

  // --- 2. HTTP Route Checks ---
  console.log('\n--- 2. Route Availability Checks ---');
  const landingRes = await makeRequest('/');
  assert.strictEqual(landingRes.statusCode, 200);
  assert(landingRes.body.includes('themeToggleBtn'));
  pass('GET / returns 200 with themeToggleBtn');

  const authRes = await makeRequest('/auth');
  assert.strictEqual(authRes.statusCode, 200);
  assert(authRes.body.includes('forgot-password-link'));
  assert(authRes.body.includes('reset-form'));
  pass('GET /auth returns 200 with forgot-password-link and reset-form');

  // --- 3. Backend Password Reset API Validation ---
  console.log('\n--- 3. Backend Password Reset API Validation ---');

  // Missing fields
  const missingRes = await makeRequest('/api/reset-password', 'POST', {});
  assert.strictEqual(missingRes.statusCode, 400);
  assert.strictEqual(missingRes.json.success, false);
  pass('Rejects reset-password with missing fields (400 Bad Request)');

  // Short password
  const shortRes = await makeRequest('/api/reset-password', 'POST', {
    email: 'test@example.com',
    newPassword: '12',
  });
  assert.strictEqual(shortRes.statusCode, 400);
  assert.strictEqual(shortRes.json.success, false);
  pass('Rejects reset-password with short password < 4 chars (400 Bad Request)');

  // Non-existent email
  const nonExistentRes = await makeRequest('/api/reset-password', 'POST', {
    email: 'does_not_exist_' + Date.now() + '@example.com',
    newPassword: 'newValidPassword123',
  });
  assert.strictEqual(nonExistentRes.statusCode, 404);
  assert.strictEqual(nonExistentRes.json.success, false);
  pass('Rejects reset-password for non-existent email (404 Not Found)');

  // --- 4. End-to-End User Reset Password Workflow ---
  console.log('\n--- 4. End-to-End Reset Password Workflow ---');
  const testEmail = `reset_user_${Date.now()}@example.com`;
  const initialPassword = 'InitialSecretPassword99';
  const updatedPassword = 'BrandNewSecretPassword100';

  // Step A: Register new user
  const signupRes = await makeRequest('/api/signup', 'POST', {
    name: 'Reset Test User',
    email: testEmail,
    password: initialPassword,
  });
  assert.strictEqual(signupRes.statusCode, 200);
  assert.strictEqual(signupRes.json.success, true);
  pass('User successfully created with initial password');

  // Step B: Sign in with initial password
  const signinOldRes = await makeRequest('/api/signin', 'POST', {
    email: testEmail,
    password: initialPassword,
  });
  assert.strictEqual(signinOldRes.statusCode, 200);
  assert.strictEqual(signinOldRes.json.success, true);
  pass('Sign in succeeds with initial password');

  // Step C: Execute Reset Password
  const resetRes = await makeRequest('/api/reset-password', 'POST', {
    email: testEmail,
    newPassword: updatedPassword,
  });
  assert.strictEqual(resetRes.statusCode, 200);
  assert.strictEqual(resetRes.json.success, true);
  assert(resetRes.json.message.includes('Password reset successfully'));
  pass('Password successfully reset via POST /api/reset-password');

  // Step D: Verify OLD password is now REJECTED
  const oldLoginAttempt = await makeRequest('/api/signin', 'POST', {
    email: testEmail,
    password: initialPassword,
  });
  assert.strictEqual(oldLoginAttempt.statusCode, 401);
  assert.strictEqual(oldLoginAttempt.json.success, false);
  pass('Old password is now strictly rejected (401 Unauthorized)');

  // Step E: Verify NEW password SUCCEEDS
  const newLoginAttempt = await makeRequest('/api/signin', 'POST', {
    email: testEmail,
    password: updatedPassword,
  });
  assert.strictEqual(newLoginAttempt.statusCode, 200);
  assert.strictEqual(newLoginAttempt.json.success, true);
  assert.strictEqual(newLoginAttempt.json.user.email, testEmail);
  pass('New password authenticates successfully and grants access');

  console.log('\n====================================================');
  console.log(`   ALL ${passed} VERIFICATION CHECKS PASSED WITH 0 FAILURES`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
