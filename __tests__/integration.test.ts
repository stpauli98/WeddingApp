import request from 'supertest';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const TEST_EMAIL = `integration-test-${Date.now()}@example.com`;

describe('API Integration: /api/guest/auth/request-code', () => {
  it('should return 200 and ok:true for valid email', async () => {
    const response = await request(BASE_URL)
      .post('/api/guest/auth/request-code')
      .send({
        email: TEST_EMAIL,
        firstName: 'Test',
        lastName: 'User'
      })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('should return 200 and ok:true for valid email', async () => {
    const response = await request(BASE_URL)
      .post('/api/guest/auth/request-code')
      .send({
        email: TEST_EMAIL,
        firstName: 'Test',
        lastName: 'User'
      })
      .set('Accept', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  }, 20000); // 20 sekundi timeout
});
