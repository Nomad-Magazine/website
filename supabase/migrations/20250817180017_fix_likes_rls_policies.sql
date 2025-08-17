-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Allow public insert likes" ON article_likes;
DROP POLICY IF EXISTS "Allow users to delete their own likes" ON article_likes;

-- Create more permissive policies for anonymous users
CREATE POLICY "Enable insert for anonymous users" ON article_likes
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Enable delete for anonymous users" ON article_likes
    FOR DELETE 
    USING (true);

-- Also ensure the view has proper permissions
GRANT SELECT ON article_like_counts TO anon;
GRANT SELECT ON article_like_counts TO authenticated;
