-- Directory submissions table for companies to submit/update their info
CREATE TABLE IF NOT EXISTS directory_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website_url TEXT,
  category TEXT,
  short_description TEXT,
  full_description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  locations TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE directory_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submissions" ON directory_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions" ON directory_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending submissions" ON directory_submissions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER directory_submissions_updated_at
  BEFORE UPDATE ON directory_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
