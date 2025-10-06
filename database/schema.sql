-- E-Government Database Schema

-- Drop existing tables if needed (for development)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (citizens, officers, admins, department heads)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'officer', 'department_head', 'admin')),
    national_id VARCHAR(50) UNIQUE,
    date_of_birth DATE,
    phone VARCHAR(20),
    address TEXT,
    department_id INTEGER,
    job_title VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    description TEXT,
    fee DECIMAL(10,2) DEFAULT 0,
    required_documents TEXT[],
    processing_time_days INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Requests table
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'pending')),
    payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    submitted_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    review_notes TEXT,
    rejection_reason TEXT
);

-- Documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key for user department after departments table is created
ALTER TABLE users ADD CONSTRAINT fk_user_department
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_service_id ON requests(service_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_documents_request_id ON documents(request_id);
CREATE INDEX idx_payments_request_id ON payments(request_id);

-- Insert initial data
INSERT INTO departments (name, description) VALUES
    ('Interior', 'Handles passports, national IDs, and civil affairs'),
    ('Commerce', 'Handles business licenses and commercial registrations'),
    ('Housing', 'Handles land registration and property documents'),
    ('Transportation', 'Handles driving licenses and vehicle registration');

INSERT INTO services (name, department_id, fee, processing_time_days) VALUES
    ('Passport Renewal', 1, 50.00, 10),
    ('National ID Update', 1, 20.00, 5),
    ('Business License', 2, 100.00, 15),
    ('Land Registration', 3, 200.00, 30),
    ('Driving License Renewal', 4, 30.00, 7);

-- Insert sample admin user (password: admin123)
INSERT INTO users (name, email, password, role) VALUES
    ('Admin User', 'admin@egov.com', '$2a$10$YourHashedPasswordHere', 'admin');