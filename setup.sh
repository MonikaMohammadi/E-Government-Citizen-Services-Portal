#!/bin/bash

# E-Government Portal Setup Script

echo "========================================="
echo "E-Government Portal Setup"
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your database credentials"
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p public/uploads

# Ask user if they want to set up the database
echo ""
read -p "Do you want to set up the database? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Setting up database..."

    # Get database credentials
    read -p "Enter PostgreSQL username (default: postgres): " db_user
    db_user=${db_user:-postgres}

    read -sp "Enter PostgreSQL password: " db_pass
    echo ""

    # Create database
    echo "Creating database..."
    PGPASSWORD=$db_pass psql -U $db_user -c "CREATE DATABASE egovernment;" 2>/dev/null || echo "Database might already exist"

    # Run schema
    echo "Running schema..."
    PGPASSWORD=$db_pass psql -U $db_user -d egovernment -f database/schema.sql

    # Ask if user wants to seed data
    echo ""
    read -p "Do you want to seed test data? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🌱 Seeding database..."
        npm run seed
    fi
fi

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'npm run dev' to start the server"
echo "3. Visit http://localhost:3000"
echo ""
echo "Test credentials (if seeded):"
echo "Admin: admin@egov.com / password123"
echo "Citizen: morsal@gmail.com / password123"
echo ""