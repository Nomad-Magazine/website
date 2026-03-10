-- Admin RLS policies for directory_submissions
-- The admin is identified by their email in the JWT

-- Allow admin to read all submissions
CREATE POLICY "Admin can view all submissions" ON directory_submissions
  FOR SELECT
  USING (auth.jwt()->>'email' = 'hey@nomadgossip.com');

-- Allow admin to update all submissions (for approve/reject)
CREATE POLICY "Admin can update all submissions" ON directory_submissions
  FOR UPDATE
  USING (auth.jwt()->>'email' = 'hey@nomadgossip.com');
