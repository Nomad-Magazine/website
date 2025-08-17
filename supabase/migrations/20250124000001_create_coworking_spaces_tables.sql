-- Create coworking spaces and voting system
-- This migration creates tables for coworking spaces with voting functionality

-- Create coworking_spaces table
CREATE TABLE IF NOT EXISTS coworking_spaces (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    website_url TEXT,
    images TEXT[] NOT NULL DEFAULT '{}', -- Array of image URLs
    amenities TEXT[] DEFAULT '{}', -- Array of amenities
    price_range TEXT, -- e.g., "$20-50/day"
    wifi_speed TEXT, -- e.g., "100 Mbps"
    submitted_by TEXT, -- User fingerprint who submitted
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create coworking_votes table for voting functionality
CREATE TABLE IF NOT EXISTS coworking_votes (
    id BIGSERIAL PRIMARY KEY,
    coworking_space_id BIGINT NOT NULL REFERENCES coworking_spaces(id) ON DELETE CASCADE,
    user_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coworking_space_id, user_fingerprint) -- Prevent duplicate votes
);

-- Create view for vote counts
CREATE OR REPLACE VIEW coworking_vote_counts AS
SELECT 
    coworking_space_id,
    COUNT(*) as vote_count
FROM coworking_votes
GROUP BY coworking_space_id;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coworking_spaces_city ON coworking_spaces(city);
CREATE INDEX IF NOT EXISTS idx_coworking_spaces_country ON coworking_spaces(country);
CREATE INDEX IF NOT EXISTS idx_coworking_spaces_featured ON coworking_spaces(is_featured);
CREATE INDEX IF NOT EXISTS idx_coworking_spaces_verified ON coworking_spaces(is_verified);
CREATE INDEX IF NOT EXISTS idx_coworking_votes_space_id ON coworking_votes(coworking_space_id);
CREATE INDEX IF NOT EXISTS idx_coworking_votes_fingerprint ON coworking_votes(user_fingerprint);

-- Enable Row Level Security
ALTER TABLE coworking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE coworking_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coworking_spaces
CREATE POLICY "Allow public read access to coworking spaces" ON coworking_spaces
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert of coworking spaces" ON coworking_spaces
    FOR INSERT 
    WITH CHECK (true);

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

-- Insert some sample data
INSERT INTO coworking_spaces (name, description, location, city, country, website_url, images, amenities, price_range, wifi_speed, is_verified, is_featured) VALUES
('Hubud Bali', 'A beautiful bamboo coworking space in the heart of Ubud, surrounded by rice fields and jungle. Perfect for digital nomads seeking inspiration and community.', 'Jl. Monkey Forest Rd, Ubud', 'Ubud', 'Indonesia', 'https://hubud.org', 
 ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800', 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800'], 
 ARRAY['High-speed WiFi', 'Bamboo architecture', 'Healthy cafe', 'Community events', 'Rice field views'], 
 '$15-25/day', '50 Mbps', true, true),

('Outsite Lisbon', 'Modern coworking and coliving space in the vibrant Príncipe Real neighborhood. Features rooftop terrace with city views and regular community dinners.', 'R. Dom Pedro V 74, Príncipe Real', 'Lisbon', 'Portugal', 'https://outsite.co', 
 ARRAY['https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800', 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800'], 
 ARRAY['Rooftop terrace', 'Community dinners', 'High-speed WiFi', 'Meeting rooms', 'Coliving available'], 
 '$20-35/day', '100 Mbps', true, true),

('Selina Playa del Carmen', 'Beachfront coworking space combining work and surf culture. Features an outdoor workspace, surf school, and wellness programs.', 'Calle 10 Norte, Playa del Carmen', 'Playa del Carmen', 'Mexico', 'https://selina.com', 
 ARRAY['https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800', 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800'], 
 ARRAY['Beach access', 'Surf school', 'Outdoor workspace', 'Wellness programs', 'Bar & restaurant'], 
 '$25-40/day', '75 Mbps', true, true),

('Dojo Bali', 'The original Canggu coworking space that started the digital nomad movement in Bali. Known for its strong community and regular events.', 'Jl. Batu Mejan, Canggu', 'Canggu', 'Indonesia', 'https://dojobali.org', 
 ARRAY['https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800', 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800', 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800'], 
 ARRAY['Historic venue', 'Strong community', 'Regular events', 'Cafe on-site', 'Near beach'], 
 '$10-20/day', '30 Mbps', true, false),

('Second Home Lisboa', 'Award-winning coworking space with stunning architecture and design. Features multiple floors, event spaces, and a focus on creativity.', 'Cais do Sodré, Lisbon', 'Lisbon', 'Portugal', 'https://secondhome.io', 
 ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'], 
 ARRAY['Award-winning design', 'Multiple floors', 'Event spaces', 'Creative focus', 'Central location'], 
 '$30-50/day', '200 Mbps', true, false);
