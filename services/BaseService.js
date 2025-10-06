const db = require('../database/DatabaseManager');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = db;
  }

  async findAll(options = {}) {
    try {
      const {
        where = {},
        orderBy = 'created_at',
        order = 'DESC',
        limit = 10,
        offset = 0,
        fields = '*'
      } = options;

      let query = `SELECT ${fields} FROM ${this.tableName}`;
      const params = [];
      let paramCount = 1;

      // Build WHERE clause
      const whereConditions = Object.entries(where)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          if (value === null) {
            return `${key} IS NULL`;
          }
          params.push(value);
          return `${key} = $${paramCount++}`;
        });

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      // Add ORDER BY
      query += ` ORDER BY ${orderBy} ${order}`;

      // Add LIMIT and OFFSET
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Error in findAll for ${this.tableName}:`, error);
      throw AppError.databaseError('Failed to fetch records');
    }
  }

  async findById(id, fields = '*') {
    try {
      const query = `SELECT ${fields} FROM ${this.tableName} WHERE id = $1`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        throw AppError.notFound(`${this.tableName} not found`);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error(`Error in findById for ${this.tableName}:`, error);
      throw AppError.databaseError('Failed to fetch record');
    }
  }

  async findOne(where) {
    try {
      const whereConditions = [];
      const params = [];
      let paramCount = 1;

      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value === null) {
            whereConditions.push(`${key} IS NULL`);
          } else {
            params.push(value);
            whereConditions.push(`${key} = $${paramCount++}`);
          }
        }
      });

      if (whereConditions.length === 0) {
        throw AppError.badRequest('No search criteria provided');
      }

      const query = `SELECT * FROM ${this.tableName} WHERE ${whereConditions.join(' AND ')} LIMIT 1`;
      const result = await this.db.query(query, params);

      return result.rows[0] || null;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error(`Error in findOne for ${this.tableName}:`, error);
      throw AppError.databaseError('Failed to fetch record');
    }
  }

  async create(data) {
    try {
      const fields = Object.keys(data).filter(key => data[key] !== undefined);
      const values = fields.map(key => data[key]);
      const placeholders = fields.map((_, index) => `$${index + 1}`);

      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error in create for ${this.tableName}:`, error);

      if (error.code === '23505') {
        throw AppError.conflict('Duplicate entry');
      }

      if (error.code === '23503') {
        throw AppError.badRequest('Invalid reference');
      }

      throw AppError.databaseError('Failed to create record');
    }
  }

  async update(id, data) {
    try {
      const fields = Object.keys(data).filter(key => data[key] !== undefined);

      if (fields.length === 0) {
        throw AppError.badRequest('No fields to update');
      }

      const values = fields.map(key => data[key]);
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`);

      values.push(id);

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw AppError.notFound(`${this.tableName} not found`);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error(`Error in update for ${this.tableName}:`, error);
      throw AppError.databaseError('Failed to update record');
    }
  }

  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        throw AppError.notFound(`${this.tableName} not found`);
      }

      return { success: true, deleted: result.rows[0] };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error(`Error in delete for ${this.tableName}:`, error);

      if (error.code === '23503') {
        throw AppError.conflict('Cannot delete: record is referenced by other records');
      }

      throw AppError.databaseError('Failed to delete record');
    }
  }

  async count(where = {}) {
    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      const params = [];
      let paramCount = 1;

      const whereConditions = Object.entries(where)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          if (value === null) {
            return `${key} IS NULL`;
          }
          params.push(value);
          return `${key} = $${paramCount++}`;
        });

      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error(`Error in count for ${this.tableName}:`, error);
      throw AppError.databaseError('Failed to count records');
    }
  }

  async exists(where) {
    try {
      const count = await this.count(where);
      return count > 0;
    } catch (error) {
      logger.error(`Error in exists for ${this.tableName}:`, error);
      throw AppError.databaseError('Failed to check existence');
    }
  }

  async paginate(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        where = {},
        orderBy = 'created_at',
        order = 'DESC'
      } = options;

      const offset = (page - 1) * limit;
      const total = await this.count(where);
      const data = await this.findAll({
        where,
        orderBy,
        order,
        limit,
        offset
      });

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error(`Error in paginate for ${this.tableName}:`, error);
      throw AppError.databaseError('Failed to paginate records');
    }
  }

  async executeQuery(query, params = []) {
    try {
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error executing custom query:', error);
      throw AppError.databaseError('Query execution failed');
    }
  }

  async transaction(callback) {
    return this.db.transaction(callback);
  }
}

module.exports = BaseService;