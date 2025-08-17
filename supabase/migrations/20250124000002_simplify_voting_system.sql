-- Simplify voting system - only votes, no coworking spaces in database
-- Coworking spaces data comes from JSON files, votes reference their IDs

-- Drop the coworking_spaces table and related objects
DROP VIEW IF EXISTS coworking_vote_counts;
DROP TABLE IF EXISTS coworking_votes;
DROP TABLE IF EXISTS coworking_spaces;

-- Create simplified votes table that references external IDs
CREATE TABLE IF NOT EXISTS coworking_votes (
    id BIGSERIAL PRIMARY KEY,
    space_id TEXT NOT NULL, -- External ID from JSON data (can be distribution ID or any other ID)
    user_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, user_fingerprint) -- Prevent duplicate votes
);

-- Create view for vote counts by space_id
CREATE OR REPLACE VIEW coworking_vote_counts AS
SELECT 
    space_id,
    COUNT(*) as vote_count
FROM coworking_votes
GROUP BY space_id;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coworking_votes_space_id ON coworking_votes(space_id);
CREATE INDEX IF NOT EXISTS idx_coworking_votes_fingerprint ON coworking_votes(user_fingerprint);

-- Enable Row Level Security
ALTER TABLE coworking_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coworking_votes
CREATE POLICY "Allow public read access to votes" ON coworking_votes
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert of votes" ON coworking_votes
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow users to delete their own votes" ON coworking_votes
    FOR DELETE 
    USING (true);
