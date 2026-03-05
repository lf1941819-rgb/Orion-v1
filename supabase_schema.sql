-- SQL Schema for Orion Lab (Supabase)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage setup (Run these in Supabase SQL Editor if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- CREATE POLICY "Avatar images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Anyone can upload an avatar." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');

-- Series Table
CREATE TABLE IF NOT EXISTS series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    axis TEXT CHECK (axis IN ('truth', 'justice', 'judgment', 'mixed')),
    type TEXT CHECK (type IN ('ontological', 'juridical', 'narrative', 'pastoral', 'mixed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) -- Optional: for multi-user support
);

-- Episodes Table
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    axis TEXT CHECK (axis IN ('truth', 'justice', 'judgment', 'mixed')),
    type TEXT CHECK (type IN ('ontological', 'juridical', 'narrative', 'pastoral', 'mixed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ideas (Nucleos) Table
CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    input_text TEXT NOT NULL,
    input_type TEXT,
    detected_verse_ref TEXT,
    series_id UUID REFERENCES series(id) ON DELETE SET NULL,
    episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis Table (Linked to Ideas)
CREATE TABLE IF NOT EXISTS analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    claim_type TEXT,
    axis TEXT,
    emotional_tone TEXT,
    thesis TEXT,
    antithesis TEXT,
    premises TEXT[],
    implications TEXT[],
    keywords TEXT[],
    warnings TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    kind TEXT CHECK (kind IN ('structural', 'tension', 'axis', 'biblical', 'exegetical')),
    question TEXT NOT NULL,
    user_answer TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'parked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connections Table
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    target_idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    relation TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional but recommended)
-- ALTER TABLE series ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
-- ... add policies as needed
