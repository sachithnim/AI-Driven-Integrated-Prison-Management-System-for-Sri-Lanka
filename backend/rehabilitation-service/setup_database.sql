-- Create rehabilitation database and user
-- Run this file using: psql -U postgres -f setup_database.sql

-- Create database
CREATE DATABASE rehabilitation;

-- Connect to the database
\c rehabilitation

-- Create user if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authuser') THEN
      CREATE USER authuser WITH PASSWORD 'authpass';
   END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rehabilitation TO authuser;
GRANT ALL PRIVILEGES ON SCHEMA public TO authuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authuser;

-- Verify connection
SELECT 'Database rehabilitation created successfully!' AS message;
