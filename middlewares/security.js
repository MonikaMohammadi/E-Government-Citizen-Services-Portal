const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Enhanced security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: !config.app.isDevelopment
});

// Rate limiting configurations
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      throw AppError.tooManyRequests('Too many requests, please try again later');
    },
    skip: (req) => {
      // Skip rate limiting for whitelisted IPs (if needed)
      const whitelistedIPs = process.env.WHITELISTED_IPS?.split(',') || [];
      return whitelistedIPs.includes(req.ip);
    }
  };

  return rateLimit({ ...defaults, ...options });
};

// Specific rate limiters for different endpoints
const rateLimiters = {
  general: createRateLimiter(),

  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: true
  }),

  api: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30 // 30 requests per minute
  }),

  fileUpload: createRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10 // 10 uploads per 5 minutes
  })
};

// CSRF protection
const csrfProtection = (req, res, next) => {
  if (config.app.isDevelopment) {
    return next();
  }

  // Skip CSRF for API routes (they should use API keys/JWT)
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Skip for GET requests
  if (req.method === 'GET') {
    return next();
  }

  const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
  const sessionToken = req.session.csrfToken;

  if (!token || token !== sessionToken) {
    logger.warn(`CSRF token mismatch for ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    throw AppError.forbidden('Invalid CSRF token');
  }

  next();
};

// Generate CSRF token
const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
};

// XSS protection - sanitize user input
const xssProtection = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

// SQL injection protection (basic)
const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/gi,
    /(--|\||;|\/\*|\*\/|xp_|sp_|0x)/gi,
    /(\bOR\b\s*\d+\s*=\s*\d+|\bAND\b\s*\d+\s*=\s*\d+)/gi
  ];

  const checkForSQLInjection = (value) => {
    if (typeof value !== 'string') return false;

    return sqlPatterns.some(pattern => pattern.test(value));
  };

  const validateObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string' && checkForSQLInjection(value)) {
          logger.warn(`Potential SQL injection attempt detected`, {
            ip: req.ip,
            path: req.path,
            field: key,
            value: value.substring(0, 100)
          });
          throw AppError.badRequest('Invalid input detected');
        }

        if (typeof value === 'object' && value !== null) {
          validateObject(value);
        }
      }
    }
  };

  validateObject(req.body);
  validateObject(req.query);
  validateObject(req.params);

  next();
};

// IP whitelist/blacklist
const ipFilter = (req, res, next) => {
  const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || [];

  if (blacklistedIPs.includes(req.ip)) {
    logger.warn(`Blocked request from blacklisted IP: ${req.ip}`);
    throw AppError.forbidden('Access denied');
  }

  next();
};

// Request size limiter
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    logger.warn(`Request size exceeded limit: ${contentLength} bytes from ${req.ip}`);
    throw AppError.badRequest('Request size exceeds limit');
  }

  next();
};

// Secure session configuration
const sessionSecurity = (req, res, next) => {
  if (req.session && req.session.user) {
    // Check session expiry
    const sessionAge = Date.now() - (req.session.lastActivity || 0);
    const maxAge = config.session.cookie.maxAge;

    if (sessionAge > maxAge) {
      req.session.destroy();
      throw AppError.unauthorized('Session expired');
    }

    // Update last activity
    req.session.lastActivity = Date.now();

    // Regenerate session ID periodically
    if (Math.random() < 0.05) { // 5% chance on each request
      req.session.regenerate((err) => {
        if (err) {
          logger.error('Session regeneration failed', err);
        }
      });
    }
  }

  next();
};

// Security audit logging
const auditLog = (action) => {
  return (req, res, next) => {
    logger.info(`Security audit: ${action}`, {
      user: req.session?.user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent')
    });
    next();
  };
};

module.exports = {
  securityHeaders,
  rateLimiters,
  csrfProtection,
  generateCSRFToken,
  xssProtection,
  sqlInjectionProtection,
  ipFilter,
  requestSizeLimiter,
  sessionSecurity,
  auditLog
};