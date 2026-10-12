import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, Min, IsOptional } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(1)
  @IsOptional()
  PORT?: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsString()
  @IsOptional()
  REDISHOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;

  @IsNumber()
  @IsOptional()
  REDISPORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsOptional()
  REDISPASSWORD?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }
  if (validatedConfig.NODE_ENV === Environment.Production) {
    const requiredProductionSecrets = [
      ['JWT_ACCESS_SECRET', validatedConfig.JWT_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', validatedConfig.JWT_REFRESH_SECRET],
    ];
    const missing = requiredProductionSecrets
      .filter(([, value]) => typeof value !== 'string' || value.length < 32)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Production configuration is invalid or missing: ${missing.join(', ')}`);
    }
    if (!validatedConfig.CORS_ORIGIN && !validatedConfig.CORS_ORIGINS) {
      throw new Error('Production configuration requires CORS_ORIGIN or CORS_ORIGINS');
    }
    if ([validatedConfig.CORS_ORIGIN, validatedConfig.CORS_ORIGINS].some((value) => value?.split(',').some((origin) => origin.trim() === '*'))) {
      throw new Error('Production configuration must not allow wildcard CORS origins');
    }
    if (!validatedConfig.REDIS_URL && !validatedConfig.REDIS_HOST && !validatedConfig.REDISHOST) {
      throw new Error('Production configuration requires REDIS_URL or REDIS_HOST');
    }
  }
  return validatedConfig;
}
