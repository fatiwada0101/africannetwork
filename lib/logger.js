/**
 * Structured Logging System for African Network Platform
 * 
 * Generates ISO-timestamped, JSON-structured logs with correlation IDs,
 * event tagging, sensitive field sanitization, and specialized financial event logging.
 * Works seamlessly with serverless runtime environments (Vercel, AWS) and external aggregators.
 */

const SENSITIVE_FIELDS = new Set([
  'password',
  'new_password',
  'current_password',
  'secret_key',
  'webhook_secret',
  'SUPABASE_SERVICE_ROLE_KEY',
  'jwt_secret',
  'pass',
  'token',
  'voucher_code',
  'pin',
]);

/**
 * Sanitize an object to ensure sensitive fields are never printed in logs.
 */
function sanitizeData(data, depth = 0) {
  if (!data || depth > 4) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      SENSITIVE_FIELDS.has(lowerKey) ||
      lowerKey.includes('pass') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('key')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Format and output a log entry.
 */
function formatLog(level, message, metadata = {}, correlationId = null) {
  const timestamp = new Date().toISOString();
  const cleanMeta = sanitizeData(metadata);
  
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(correlationId ? { correlationId } : {}),
    ...(Object.keys(cleanMeta || {}).length > 0 ? { data: cleanMeta } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  return entry;
}

export const logger = {
  info(message, metadata = {}, correlationId = null) {
    return formatLog('info', message, metadata, correlationId);
  },

  warn(message, metadata = {}, correlationId = null) {
    return formatLog('warn', message, metadata, correlationId);
  },

  error(message, errorOrMeta = {}, correlationId = null) {
    let metadata = {};
    if (errorOrMeta instanceof Error) {
      metadata = {
        name: errorOrMeta.name,
        message: errorOrMeta.message,
        stack: errorOrMeta.stack,
      };
    } else if (typeof errorOrMeta === 'object') {
      metadata = { ...errorOrMeta };
      if (metadata.error instanceof Error) {
        metadata.errorMessage = metadata.error.message;
        metadata.errorStack = metadata.error.stack;
        delete metadata.error;
      }
    }
    return formatLog('error', message, metadata, correlationId);
  },

  /**
   * Specialized financial event logger for immutable ledger audits
   */
  financial({ action, amount, userId, ref, status, balanceAfter, details = {} }, correlationId = null) {
    return formatLog('info', `FINANCIAL_EVENT: ${action}`, {
      financialEvent: true,
      action,
      amount: Number(amount) || 0,
      currency: 'NGN',
      userId: userId || 'anonymous',
      ref: ref || null,
      status: status || 'unknown',
      balanceAfter: balanceAfter !== undefined ? Number(balanceAfter) : null,
      ...details,
    }, correlationId);
  },

  /**
   * Helper to extract correlation ID from request headers
   */
  getCorrelationId(request) {
    if (!request) return null;
    return request.headers?.get?.('x-correlation-id') || null;
  },

  /**
   * Redact sensitive fields from an object
   */
  redact(data) {
    return sanitizeData(data);
  },
  sanitizeData(data) {
    return sanitizeData(data);
  },
};

export default logger;
