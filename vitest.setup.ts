// vitest.setup.ts - Test environment setup
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Required environment variables for tests
  process.env.IP_FINGERPRINT_SALT = 'test-salt-that-is-at-least-32-characters-long-for-testing';
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  process.env.RESEND_API_KEY = 're_test_key';
  process.env.FROM_EMAIL = 'test@rentinhyderabad.in';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  process.env.TURNSTILE_BYPASS_DEV = 'true';
  process.env.RESEND_WEBHOOK_SECRET = 'test-webhook-secret';
});