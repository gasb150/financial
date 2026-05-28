const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadFunctionsFromFile } = require('./helpers/sourceFnLoader');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'app.js');

test('isGoogleOAuthSessionActive validates token expiry window', () => {
  const now = Date.now();
  const ctx = loadFunctionsFromFile(APP_JS, ['getGoogleOAuthSession', 'isGoogleOAuthSessionActive'], {
    appData: {
      googleAuth: {
        session: {
          accessToken: 'token-ok',
          expiresAtMs: now + 120000
        }
      }
    },
    Date: { now: () => now }
  });

  assert.equal(ctx.isGoogleOAuthSessionActive(), true);

  ctx.appData.googleAuth.session.expiresAtMs = now + 5000;
  assert.equal(ctx.isGoogleOAuthSessionActive(), false);

  ctx.appData.googleAuth.session = null;
  assert.equal(ctx.isGoogleOAuthSessionActive(), false);
});

test('renderGoogleAuthConfig shows active session and clears error when empty', () => {
  const nodes = {
    'google-oauth-client-id': { value: '' },
    'google-oauth-redirect': { value: '' },
    'google-auth-status': { innerText: '' },
    'google-auth-error': { innerText: '' }
  };

  const now = Date.now();
  const ctx = loadFunctionsFromFile(APP_JS, [
    'getGoogleOAuthConfig',
    'getGoogleOAuthRedirectUri',
    'getGoogleOAuthSession',
    'isGoogleOAuthSessionActive',
    'renderGoogleAuthConfig'
  ], {
    appData: {
      googleAuth: {
        provider: 'google',
        clientId: 'abc.apps.googleusercontent.com',
        scope: 'openid profile email',
        lastError: '',
        session: {
          accessToken: 'token',
          expiresAtMs: now + 300000,
          user: { email: 'demo@example.com' }
        }
      }
    },
    window: {
      location: {
        origin: 'https://demo.test',
        pathname: '/index.html'
      }
    },
    document: {
      getElementById: (id) => nodes[id] || null
    },
    Date: class extends Date {
      static now() { return now; }
    },
    GOOGLE_OAUTH_DEFAULT_SCOPE: 'openid profile email https://www.googleapis.com/auth/drive.appdata'
  });

  ctx.renderGoogleAuthConfig();

  assert.equal(nodes['google-oauth-client-id'].value, 'abc.apps.googleusercontent.com');
  assert.equal(nodes['google-oauth-redirect'].value, 'https://demo.test/index.html');
  assert.match(nodes['google-auth-status'].innerText, /Sesi[oó]n activa/);
  assert.match(nodes['google-auth-status'].innerText, /demo@example.com/);
  assert.equal(nodes['google-auth-error'].innerText, '');
});
