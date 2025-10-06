const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration validation
const required = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'SESSION_SECRET'
];

const missing = required.filter(key => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'E-Government Portal',
    url: process.env.APP_URL || 'http://localhost:3000',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
  },

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'egovernment',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10)
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || (
      process.env.NODE_ENV === 'production'
        ? (() => { throw new Error('SESSION_SECRET is required in production'); })()
        : 'dev-secret-change-this'
    ),
    name: 'egov_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
      sameSite: 'strict'
    }
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@egov.com',
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx').split(','),
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIR || path.join(__dirname, '..', 'logs')
  },

  // Pagination
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT || '10', 10),
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT || '100', 10)
  }
};

// Validate configuration
function validateConfig() {
  const errors = [];

  if (config.app.isProduction) {
    if (!config.email.auth.user || !config.email.auth.pass) {
      errors.push('Email credentials are required in production');
    }
    if (config.session.secret === 'dev-secret-change-this') {
      errors.push('SESSION_SECRET must be set in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

validateConfig();

module.exports = config;