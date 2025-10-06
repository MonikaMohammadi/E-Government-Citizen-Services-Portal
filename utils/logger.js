const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };

    this.colors = {
      ERROR: '\x1b[31m',
      WARN: '\x1b[33m',
      INFO: '\x1b[36m',
      DEBUG: '\x1b[90m',
      RESET: '\x1b[0m'
    };

    this.currentLevel = this.levels[config.logging.level.toUpperCase()] || this.levels.INFO;

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(config.logging.directory)) {
      fs.mkdirSync(config.logging.directory, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const formattedMeta = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';

    if (config.logging.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    }

    return `[${timestamp}] [${level}] ${message} ${formattedMeta}`;
  }

  writeToFile(level, message) {
    const fileName = `${new Date().toISOString().split('T')[0]}.log`;
    const filePath = path.join(config.logging.directory, fileName);
    const logEntry = `${message}\n`;

    fs.appendFileSync(filePath, logEntry);
  }

  log(level, message, meta = {}) {
    if (this.levels[level] > this.currentLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    // Console output with colors in development
    if (config.app.isDevelopment) {
      const color = this.colors[level] || this.colors.RESET;
      console.log(`${color}${formattedMessage}${this.colors.RESET}`);
    } else {
      console.log(formattedMessage);
    }

    // Write to file
    if (config.app.isProduction || level === 'ERROR') {
      this.writeToFile(level, formattedMessage);
    }
  }

  error(message, error = null) {
    const meta = error ? {
      stack: error.stack,
      code: error.code,
      name: error.name
    } : {};

    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // HTTP request logger middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';

        this.log(logLevel, `${req.method} ${req.originalUrl}`, {
          status: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      });

      next();
    };
  }

  // Error logger middleware
  errorLogger() {
    return (err, req, res, next) => {
      this.error(`${req.method} ${req.originalUrl} - ${err.message}`, err);
      next(err);
    };
  }
}

module.exports = new Logger();