/**
 * Environment variable validation for production deployment
 */

export interface RequiredEnvVars {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SESSION_SECRET: string;
  REPLIT_DOMAINS: string;
  REPL_ID: string;
}

export function validateEnvironment(): { isValid: boolean; missingVars: string[] } {
  const requiredVars: (keyof RequiredEnvVars)[] = [
    'DATABASE_URL',
    'JWT_SECRET', 
    'SESSION_SECRET',
    'REPLIT_DOMAINS',
    'REPL_ID'
  ];

  const missingVars: string[] = [];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  });

  // Additional validation for JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    missingVars.push('JWT_SECRET (must be at least 32 characters)');
  }

  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

export function getSecureEnvVar(key: keyof RequiredEnvVars): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}