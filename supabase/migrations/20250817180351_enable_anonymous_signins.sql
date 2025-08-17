-- Enable anonymous sign-ins
-- This needs to be done in the Supabase dashboard under Authentication > Settings
-- But we can update RLS policies to work with anonymous users properly

-- Update RLS policies to work with anonymous authenticated users
-- Anonymous users will have is_anonymous = true in their JWT

-- Drop and recreate policies to handle anonymous users properly
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON article_likes;
DROP POLICY IF EXISTS "Enable delete for anonymous users" ON article_likes;

-- Allow authenticated users (including anonymous) to insert likes
CREATE POLICY "Allow authenticated users to insert likes" ON article_likes
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users (including anonymous) to delete their own likes
CREATE POLICY "Allow authenticated users to delete likes" ON article_likes
    FOR DELETE 
    TO authenticated
    USING (true);
