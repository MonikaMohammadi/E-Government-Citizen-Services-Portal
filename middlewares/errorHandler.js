const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const config = require('../config/config');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error: ${error.message}`, err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = AppError.badRequest(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = AppError.conflict(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = AppError.validationError(message);
  }

  // PostgreSQL errors
  if (err.code === '23505') { // Unique constraint violation
    error = AppError.conflict('A record with this value already exists');
  }

  if (err.code === '23503') { // Foreign key violation
    error = AppError.badRequest('Referenced record does not exist');
  }

  if (err.code === '23502') { // Not null violation
    error = AppError.validationError('Required field is missing');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = AppError.unauthorized('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = AppError.unauthorized('Token expired');
  }

  // Set default error
  if (!error.statusCode) {
    error = AppError.internalError(
      config.app.isDevelopment ? error.message : 'Something went wrong'
    );
  }

  // Send error response
  const statusCode = error.statusCode || 500;

  // API response
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        ...(config.app.isDevelopment && {
          stack: err.stack,
          details: err
        })
      }
    });
  }

  // HTML response (for web views)
  res.status(statusCode);

  // Render appropriate error page
  if (statusCode === 404) {
    return res.render('errors/404', {
      title: 'Page Not Found',
      message: error.message
    });
  }

  res.render('errors/404', {
    title: 'Error',
    message: error.message,
    statusCode,
    ...(config.app.isDevelopment && {
      stack: err.stack,
      details: JSON.stringify(err, null, 2)
    })
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler
const notFound = (req, res, next) => {
  const error = AppError.notFound(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound
};