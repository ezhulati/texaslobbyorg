/**
 * CORS Configuration for API Routes
 * Handles Cross-Origin Resource Sharing with security in mind
 */

export interface CORSOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const defaultOptions: CORSOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: false,
  maxAge: 86400, // 24 hours
};

/**
 * Production-safe CORS configuration
 */
export const productionCORS: CORSOptions = {
  origin: (origin: string) => {
    const allowedOrigins = [
      'https://texaslobby.org',
      'https://www.texaslobby.org',
      ...(import.meta.env.PUBLIC_SITE_URL ? [import.meta.env.PUBLIC_SITE_URL] : []),
    ];
    return allowedOrigins.includes(origin);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,
};

/**
 * Development CORS configuration (more permissive)
 */
export const developmentCORS: CORSOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: false,
  maxAge: 3600,
};

/**
 * Get CORS configuration based on environment
 */
export function getCORSConfig(): CORSOptions {
  const isDev = import.meta.env.DEV;
  return isDev ? developmentCORS : productionCORS;
}

/**
 * Apply CORS headers to a response
 */
export function applyCORSHeaders(
  response: Response,
  request: Request,
  options: CORSOptions = defaultOptions
): Response {
  const origin = request.headers.get('origin') || '';
  const headers = new Headers(response.headers);

  // Determine if origin is allowed
  let allowedOrigin = '*';
  if (typeof options.origin === 'string') {
    allowedOrigin = options.origin;
  } else if (Array.isArray(options.origin)) {
    allowedOrigin = options.origin.includes(origin) ? origin : options.origin[0];
  } else if (typeof options.origin === 'function') {
    allowedOrigin = options.origin(origin) ? origin : '';
  }

  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }

  if (options.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (options.methods) {
    headers.set('Access-Control-Allow-Methods', options.methods.join(', '));
  }

  if (options.allowedHeaders) {
    headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
  }

  if (options.exposedHeaders) {
    headers.set('Access-Control-Expose-Headers', options.exposedHeaders.join(', '));
  }

  if (options.maxAge) {
    headers.set('Access-Control-Max-Age', options.maxAge.toString());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle CORS preflight (OPTIONS) requests
 */
export function handleCORSPreflight(
  request: Request,
  options: CORSOptions = defaultOptions
): Response {
  const origin = request.headers.get('origin') || '';
  const headers = new Headers();

  // Determine if origin is allowed
  let allowedOrigin = '*';
  if (typeof options.origin === 'string') {
    allowedOrigin = options.origin;
  } else if (Array.isArray(options.origin)) {
    allowedOrigin = options.origin.includes(origin) ? origin : options.origin[0];
  } else if (typeof options.origin === 'function') {
    allowedOrigin = options.origin(origin) ? origin : '';
  }

  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }

  if (options.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (options.methods) {
    headers.set('Access-Control-Allow-Methods', options.methods.join(', '));
  }

  if (options.allowedHeaders) {
    headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
  }

  if (options.maxAge) {
    headers.set('Access-Control-Max-Age', options.maxAge.toString());
  }

  return new Response(null, { status: 204, headers });
}

/**
 * Wrapper for API routes that automatically handles CORS
 */
export function withCORS(
  handler: (request: Request) => Promise<Response> | Response,
  options?: CORSOptions
) {
  return async (request: Request): Promise<Response> => {
    const corsConfig = options || getCORSConfig();

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return handleCORSPreflight(request, corsConfig);
    }

    // Handle actual request
    const response = await handler(request);
    return applyCORSHeaders(response, request, corsConfig);
  };
}
