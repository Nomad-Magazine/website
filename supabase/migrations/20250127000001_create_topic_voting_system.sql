-- Create topic voting system for writers page
-- Allows users to vote on article topics they want to see covered

-- Create topic votes table
CREATE TABLE IF NOT EXISTS topic_votes (
    id BIGSERIAL PRIMARY KEY,
    topic_id TEXT NOT NULL, -- External topic ID from frontend
    user_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(topic_id, user_fingerprint) -- Prevent duplicate votes
);

-- Create view for vote counts by topic_id
CREATE OR REPLACE VIEW topic_vote_counts AS
SELECT 
    topic_id,
    COUNT(*) as vote_count
FROM topic_votes
GROUP BY topic_id;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_votes_topic_id ON topic_votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_votes_fingerprint ON topic_votes(user_fingerprint);

-- Enable Row Level Security
ALTER TABLE topic_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topic_votes
CREATE POLICY "Allow public read access to topic votes" ON topic_votes
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow authenticated users to insert topic votes" ON topic_votes
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete their topic votes" ON topic_votes
    FOR DELETE 
    TO authenticated
    USING (true);
