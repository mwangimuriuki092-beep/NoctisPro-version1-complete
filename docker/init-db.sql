-- Initialize NoctisPro PACS Database
-- Medical-grade database initialization

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS noctispro;

-- Set proper encoding for medical data
ALTER DATABASE noctispro SET default_text_search_config = 'pg_catalog.english';

-- Create indexes for performance
-- These will be created by Django migrations, but we can optimize

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE noctispro TO noctispro;