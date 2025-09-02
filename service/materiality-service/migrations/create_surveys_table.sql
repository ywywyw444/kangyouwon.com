-- Create surveys table for Materiality Service
-- This script creates the surveys table with all required columns including content_hash

-- Create surveys table
CREATE TABLE IF NOT EXISTS surveys (
    survey_id VARCHAR(255) PRIMARY KEY,
    corporation_id VARCHAR(255) NOT NULL,
    content_hash VARCHAR(255),  -- 설문 내용 해시값 (동일 내용 판단용)
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_categories INTEGER NOT NULL,
    categories TEXT NOT NULL,  -- JSONB data as TEXT
    excel_data TEXT,  -- JSONB data as TEXT (nullable)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_surveys_corporation_id ON surveys(corporation_id);
CREATE INDEX IF NOT EXISTS idx_surveys_content_hash ON surveys(content_hash);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at);

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id VARCHAR(255) NOT NULL,
    participant_id VARCHAR(255) NOT NULL,
    participant_name VARCHAR(255),
    participant_company VARCHAR(255),
    participant_position VARCHAR(255),
    participant_email VARCHAR(255),
    responses TEXT NOT NULL,  -- JSONB data as TEXT
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    corporation_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE
);

-- Create indexes for survey_responses table
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_participant_email ON survey_responses(participant_email);
CREATE INDEX IF NOT EXISTS idx_survey_responses_corporation_id ON survey_responses(corporation_id);

-- Add unique constraint to prevent duplicate responses from same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_responses_unique_email 
ON survey_responses(survey_id, participant_email);

-- Verify tables were created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('surveys', 'survey_responses')
ORDER BY table_name, ordinal_position;
