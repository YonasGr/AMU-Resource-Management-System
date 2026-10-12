import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const baseProductionConfig = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://app:secret@db:5432/amu',
    REDIS_URL: 'redis://redis:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    CORS_ORIGIN: 'https://amu-frontend.example.com',
  };

  it('accepts complete production configuration', () => {
    expect(() => validateEnv(baseProductionConfig)).not.toThrow();
  });

  it('rejects production JWT fallback configuration', () => {
    expect(() =>
      validateEnv({
        ...baseProductionConfig,
        JWT_ACCESS_SECRET: 'short',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects production wildcard CORS', () => {
    expect(() =>
      validateEnv({
        ...baseProductionConfig,
        CORS_ORIGIN: '*',
      }),
    ).toThrow(/wildcard CORS/);
  });

  it('requires Redis configuration in production', () => {
    const { REDIS_URL: _redisUrl, ...withoutRedis } = baseProductionConfig;
    expect(() => validateEnv(withoutRedis)).toThrow(/REDIS_URL or REDIS_HOST/);
  });
});
