const bcrypt = require('bcryptjs');
const BaseService = require('./BaseService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config/config');

class UserService extends BaseService {
  constructor() {
    super('users');
  }

  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.findOne({ email: userData.email });
      if (existingUser) {
        throw AppError.conflict('User with this email already exists');
      }

      // Check national ID if provided
      if (userData.nationalId) {
        const existingNationalId = await this.findOne({ national_id: userData.nationalId });
        if (existingNationalId) {
          throw AppError.conflict('User with this national ID already exists');
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, config.security.bcryptRounds);

      // Prepare user data
      const newUser = {
        name: userData.name,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'citizen',
        national_id: userData.nationalId || null,
        date_of_birth: userData.dateOfBirth || null,
        phone: userData.phone || null,
        address: userData.address || null
      };

      // Create user
      const user = await this.create(newUser);

      // Remove password from response
      delete user.password;

      logger.info(`New user registered: ${user.email}`);

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Error in user registration:', error);
      throw AppError.internalError('Registration failed');
    }
  }

  async login(email, password) {
    try {
      // Find user by email
      const user = await this.findOne({ email: email.toLowerCase() });

      if (!user) {
        throw AppError.unauthorized('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        // Log failed login attempt
        logger.warn(`Failed login attempt for email: ${email}`);
        throw AppError.unauthorized('Invalid email or password');
      }

      // Remove password from response
      delete user.password;

      logger.info(`User logged in: ${user.email}`);

      return user;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Error in user login:', error);
      throw AppError.internalError('Login failed');
    }
  }

  async updateProfile(userId, updates) {
    try {
      // Don't allow role or password updates through this method
      delete updates.role;
      delete updates.password;

      // Check email uniqueness if updating email
      if (updates.email) {
        const existingUser = await this.findOne({ email: updates.email.toLowerCase() });
        if (existingUser && existingUser.id !== userId) {
          throw AppError.conflict('Email already in use');
        }
        updates.email = updates.email.toLowerCase();
      }

      // Check national ID uniqueness if updating
      if (updates.nationalId) {
        const existingNationalId = await this.findOne({ national_id: updates.nationalId });
        if (existingNationalId && existingNationalId.id !== userId) {
          throw AppError.conflict('National ID already in use');
        }
        updates.national_id = updates.nationalId;
        delete updates.nationalId;
      }

      // Handle date of birth
      if (updates.dateOfBirth) {
        updates.date_of_birth = updates.dateOfBirth;
        delete updates.dateOfBirth;
      }

      const updatedUser = await this.update(userId, updates);

      // Remove password from response
      delete updatedUser.password;

      logger.info(`User profile updated: ${updatedUser.email}`);

      return updatedUser;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Error updating user profile:', error);
      throw AppError.internalError('Profile update failed');
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password
      const user = await this.findById(userId);

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        throw AppError.unauthorized('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);

      // Update password
      await this.update(userId, { password: hashedPassword });

      logger.info(`Password changed for user ID: ${userId}`);

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Error changing password:', error);
      throw AppError.internalError('Password change failed');
    }
  }

  async getUsersByRole(role, options = {}) {
    try {
      const users = await this.findAll({
        ...options,
        where: { role },
        fields: 'id, name, email, role, department_id, job_title, created_at'
      });

      return users;
    } catch (error) {
      logger.error('Error fetching users by role:', error);
      throw AppError.databaseError('Failed to fetch users');
    }
  }

  async getUsersInDepartment(departmentId, options = {}) {
    try {
      const users = await this.findAll({
        ...options,
        where: { department_id: departmentId },
        fields: 'id, name, email, role, job_title, created_at'
      });

      return users;
    } catch (error) {
      logger.error('Error fetching department users:', error);
      throw AppError.databaseError('Failed to fetch department users');
    }
  }

  async assignToDepartment(userId, departmentId, jobTitle = null) {
    try {
      const updates = {
        department_id: departmentId,
        job_title: jobTitle
      };

      const updatedUser = await this.update(userId, updates);

      logger.info(`User ${userId} assigned to department ${departmentId}`);

      return updatedUser;
    } catch (error) {
      if (error instanceof AppError) throw error;

      logger.error('Error assigning user to department:', error);
      throw AppError.internalError('Department assignment failed');
    }
  }

  async getUserStatistics(userId) {
    try {
      const stats = await this.executeQuery(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          COUNT(DISTINCT r.id) as total_requests,
          COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END) as approved_requests,
          COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pending_requests,
          COUNT(DISTINCT CASE WHEN r.status = 'rejected' THEN r.id END) as rejected_requests,
          COUNT(DISTINCT p.id) as total_payments,
          SUM(p.amount) as total_amount_paid
        FROM users u
        LEFT JOIN requests r ON u.id = r.user_id
        LEFT JOIN payments p ON r.id = p.request_id AND p.status = 'completed'
        WHERE u.id = $1
        GROUP BY u.id, u.name, u.email, u.role
      `, [userId]);

      return stats[0] || null;
    } catch (error) {
      logger.error('Error fetching user statistics:', error);
      throw AppError.databaseError('Failed to fetch user statistics');
    }
  }

  async searchUsers(searchTerm, options = {}) {
    try {
      const query = `
        SELECT id, name, email, role, national_id, phone, created_at
        FROM users
        WHERE (
          LOWER(name) LIKE LOWER($1) OR
          LOWER(email) LIKE LOWER($1) OR
          national_id LIKE $1 OR
          phone LIKE $1
        )
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const searchPattern = `%${searchTerm}%`;
      const limit = options.limit || 10;
      const offset = options.offset || 0;

      const users = await this.executeQuery(query, [searchPattern, limit, offset]);

      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw AppError.databaseError('User search failed');
    }
  }

  async validateUserAccess(userId, resourceType, resourceId) {
    try {
      // Check if user owns the resource
      const query = `
        SELECT EXISTS (
          SELECT 1
          FROM ${resourceType}
          WHERE id = $1 AND user_id = $2
        ) as has_access
      `;

      const result = await this.executeQuery(query, [resourceId, userId]);

      return result[0].has_access;
    } catch (error) {
      logger.error('Error validating user access:', error);
      return false;
    }
  }
}

module.exports = new UserService();