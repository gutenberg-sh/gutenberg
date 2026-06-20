import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const CORS_CONFIG: Record<'development' | 'production', CorsOptions> = {
  development: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  },
  production: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  },
};

export function resolve_cors_options(
  environment: 'development' | 'production',
  cors_origins: string,
): CorsOptions {
  const origin = cors_origins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    ...CORS_CONFIG[environment],
    origin,
  };
}
