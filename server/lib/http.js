import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, code, details) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const bad = (code = 'bad_request', details) => {
  throw new HttpError(400, code, details);
};
export const denied = (code = 'forbidden') => {
  throw new HttpError(403, code);
};
export const notFound = (code = 'not_found') => {
  throw new HttpError(404, code);
};

/** Wraps an async handler so rejected promises reach the error middleware. */
export const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      fields: err.issues.reduce((acc, i) => {
        acc[i.path.join('.') || '_'] = i.message;
        return acc;
      }, {}),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, details: err.details });
  }
  if (err?.message === 'unsupported_file_type') {
    return res.status(400).json({ error: 'unsupported_file_type' });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'file_too_large' });
  }
  console.error('[api error]', err);
  res.status(500).json({ error: 'server_error' });
}

export const int = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
