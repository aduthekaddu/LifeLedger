import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

export interface Env {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigin: string;
  frontendUrl: string;
  uploadDir: string;
  maxFileSizeBytes: number;
  emergencyAccessTtlMinutes: number;
  logLevel: string;
}

function requireString(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

function parseNodeEnv(): NodeEnv {
  const raw = process.env.NODE_ENV ?? 'development';
  if (raw === 'development' || raw === 'test' || raw === 'production') {
    return raw;
  }
  throw new Error(`NODE_ENV must be development, test, or production. Received ${raw}`);
}

function validateJwtSecret(secret: string, nodeEnv: NodeEnv): void {
  const weakValues = [
    'secret',
    'password',
    'change-me',
    'your_super_secret_jwt_key_change_this_in_production',
    'replace-with-a-generated-64-character-secret',
  ];

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  if (nodeEnv !== 'development' && weakValues.includes(secret)) {
    throw new Error('JWT_SECRET is a placeholder and cannot be used outside development');
  }
}

const nodeEnv = parseNodeEnv();
const jwtSecret = requireString('JWT_SECRET');
validateJwtSecret(jwtSecret, nodeEnv);

export const env: Env = {
  nodeEnv,
  port: numberFromEnv('PORT', 5000),
  databaseUrl: requireString('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR ?? './private-uploads',
  maxFileSizeBytes: numberFromEnv('MAX_FILE_SIZE_BYTES', 10 * 1024 * 1024),
  emergencyAccessTtlMinutes: numberFromEnv('EMERGENCY_ACCESS_TTL_MINUTES', 120),
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
