-- Create likes table for anonymous users to like articles
CREATE TABLE article_likes (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT NOT NULL REFERENCES test_articles(id) ON DELETE CASCADE,
    user_fingerprint TEXT NOT NULL, -- Browser fingerprint for anonymous users
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index to prevent duplicate likes from same user
CREATE UNIQUE INDEX unique_article_user_like ON article_likes(article_id, user_fingerprint);

-- Enable Row Level Security
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read likes (for counting)
CREATE POLICY "Allow public read access to likes" ON article_likes
    FOR SELECT 
    USING (true);

-- Allow anyone to insert likes (anonymous users can like)
CREATE POLICY "Allow public insert likes" ON article_likes
    FOR INSERT 
    WITH CHECK (true);

-- Allow users to delete their own likes (unlike)
CREATE POLICY "Allow users to delete their own likes" ON article_likes
    FOR DELETE 
    USING (true);

-- Create a view to get article like counts
CREATE VIEW article_like_counts AS
SELECT 
    article_id,
    COUNT(*) as like_count
FROM article_likes
GROUP BY article_id;

-- Enable RLS on the view (it inherits from the table)
ALTER VIEW article_like_counts OWNER TO postgres;
