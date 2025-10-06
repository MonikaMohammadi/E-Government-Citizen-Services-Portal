const { Pool } = require('pg');
const config = require('../config/config');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async connect() {
    try {
      if (this.pool) {
        return this.pool;
      }

      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        max: config.database.max,
        min: config.database.min,
        idleTimeoutMillis: config.database.idleTimeoutMillis,
        connectionTimeoutMillis: config.database.connectionTimeoutMillis
      });

      // Test connection
      await this.pool.query('SELECT 1');
      this.isConnected = true;
      this.retryCount = 0;

      console.log('✅ Database connected successfully');

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('Unexpected database error:', err);
        this.handleConnectionError(err);
      });

      return this.pool;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      await this.handleConnectionError(error);
    }
  }

  async handleConnectionError(error) {
    this.isConnected = false;

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 Retrying database connection (${this.retryCount}/${this.maxRetries})...`);

      await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.retryCount));

      return this.connect();
    } else {
      throw new Error(`Database connection failed after ${this.maxRetries} retries: ${error.message}`);
    }
  }

  async query(text, params) {
    if (!this.isConnected) {
      await this.connect();
    }

    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (config.app.isDevelopment && duration > 1000) {
        console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (error) {
      console.error('Query error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getClient() {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('Database connection closed');
    }
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as db_version');
      return {
        healthy: true,
        timestamp: result.rows[0].current_time,
        version: result.rows[0].db_version,
        poolStats: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new DatabaseManager();