-- Create pmsdb database if it doesn't exist
SELECT 'CREATE DATABASE pmsdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pmsdb')\gexec

-- Grant all privileges to the default user
GRANT ALL PRIVILEGES ON DATABASE pmsdb TO authuser;
