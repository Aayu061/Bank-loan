const request = require('supertest');
const child = require('child_process');
const app = require('../index');

const DB_TEST = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL_TEST;

if (!DB_TEST) {
  console.warn('Skipping backend auth tests: set DATABASE_URL_TEST to run them');
  test('skipped - no DATABASE_URL_TEST', () => { expect(true).toBe(true); });
} else {
  beforeAll(() => {
    // ensure migrations run against the test DB
    const env = Object.assign({}, process.env, { DATABASE_URL: DB_TEST });
    child.execSync('node migrate.js', { cwd: __dirname + '/..', env, stdio: 'inherit' });
  }, 20000);

  test('register, login, me flow', async () => {
    const email = `test+${Date.now()}@example.com`;
    const password = 'TestPass123!';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ first_name: 'Test', last_name: 'User', email, password })
      .set('Accept', 'application/json');

    expect(registerRes.status).toBe(200);
    expect(registerRes.body.ok).toBe(true);
    expect(registerRes.body.user.email).toBe(email);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .set('Accept', 'application/json');

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.ok).toBe(true);
    // cookie should be set
    expect(loginRes.headers['set-cookie']).toBeDefined();

    // use agent to persist cookie
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email, password });
    const meRes = await agent.get('/api/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.ok).toBe(true);
    expect(meRes.body.user.email).toBe(email);
  }, 20000);
}
