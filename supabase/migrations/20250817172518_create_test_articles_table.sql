-- Create test_articles table
CREATE TABLE test_articles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE test_articles ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (anyone can read)
CREATE POLICY "Allow public read access" ON test_articles
    FOR SELECT 
    USING (true);

-- Create policy to prevent public insert/update/delete
CREATE POLICY "Prevent public write access" ON test_articles
    FOR ALL 
    USING (false);

-- Insert seed data
INSERT INTO test_articles (title, content, author) VALUES 
(
    'Welcome to Digital Nomad Life',
    'Discover the freedom of working remotely while exploring the world. From bustling cafes in Bangkok to co-working spaces in Lisbon, the digital nomad lifestyle offers endless possibilities for those seeking adventure and professional growth.',
    'Sarah Chen'
),
(
    'Best Coworking Spaces in Europe',
    'Europe offers some of the world''s most innovative coworking spaces. Whether you''re in Berlin''s tech scene, Barcelona''s creative districts, or Amsterdam''s startup ecosystem, you''ll find communities that inspire and support your remote work journey.',
    'Marcus Rodriguez'
),
(
    'Remote Work Tools That Actually Work',
    'After years of remote work, we''ve tested countless productivity tools. Here are the ones that have truly made a difference in our daily workflows, from project management to communication and time tracking.',
    'Alex Thompson'
),
(
    'Visa Guide for Digital Nomads 2024',
    'Navigating visa requirements as a digital nomad can be complex. This comprehensive guide covers the latest visa options, requirements, and application processes for the most nomad-friendly countries.',
    'Elena Petrov'
),
(
    'Building Community While Traveling',
    'One of the biggest challenges of nomadic life is maintaining meaningful connections. Learn strategies for building lasting relationships and finding your tribe while constantly on the move.',
    'Jordan Kim'
);
