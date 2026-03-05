-- ===============================================================
-- MIGRATION SQL: ÓRION LAB CANONICAL SCHEMA & MULTI-USER SECURITY
-- ===============================================================
-- Description: Refactors the schema for multi-user support, 
-- enables RLS with deny-by-default policies, and resolves 
-- relationship ambiguities.
-- ===============================================================

-- 1. EXTENSIONS & FUNCTIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to handle updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TABLES REFACTORING (DOMAIN TABLES)

-- 2.1 PROFILES
-- Adjusting existing profiles table or creating new one
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
        -- Rename full_name to display_name if it exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
            ALTER TABLE public.profiles RENAME COLUMN full_name TO display_name;
        END IF;
        -- Add updated_at if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN
            ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        -- Add created_at if missing
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='profiles' AND column_name='created_at') THEN
            ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    ELSE
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2.2 SERIES
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'series') THEN
        -- Rename user_id to owner_id if it exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='series' AND column_name='user_id') THEN
            ALTER TABLE public.series RENAME COLUMN user_id TO owner_id;
        ELSE
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='series' AND column_name='owner_id') THEN
                ALTER TABLE public.series ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            END IF;
        END IF;
        -- Add updated_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='series' AND column_name='updated_at') THEN
            ALTER TABLE public.series ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    ELSE
        CREATE TABLE public.series (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2.3 EPISODES
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'episodes') THEN
        -- Add owner_id
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='episodes' AND column_name='owner_id') THEN
            ALTER TABLE public.episodes ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        -- Add updated_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='episodes' AND column_name='updated_at') THEN
            ALTER TABLE public.episodes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    ELSE
        CREATE TABLE public.episodes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2.4 IDEAS (NÚCLEOS)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ideas') THEN
        -- Add owner_id
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='ideas' AND column_name='owner_id') THEN
            ALTER TABLE public.ideas ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        -- Add updated_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='ideas' AND column_name='updated_at') THEN
            ALTER TABLE public.ideas ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        -- Ensure input_type constraint
        ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS ideas_input_type_check;
        ALTER TABLE public.ideas ADD CONSTRAINT ideas_input_type_check CHECK (input_type IN ('phrase','verse','question','narrative','mixed'));
    ELSE
        CREATE TABLE public.ideas (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
            episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
            input_text TEXT NOT NULL,
            input_type TEXT NOT NULL CHECK (input_type IN ('phrase','verse','question','narrative','mixed')),
            detected_verse_ref TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2.5 ANALYSES (Renaming from analysis if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'analysis') AND NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'analyses') THEN
        ALTER TABLE public.analysis RENAME TO analyses;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'analyses') THEN
        CREATE TABLE public.analyses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            idea_id UUID NOT NULL UNIQUE REFERENCES public.ideas(id) ON DELETE CASCADE,
            engine_version TEXT NOT NULL DEFAULT 'v1',
            claim_type TEXT NOT NULL CHECK (claim_type IN ('ontological','juridical','narrative','pastoral','mixed')),
            axis TEXT NOT NULL CHECK (axis IN ('truth','justice','judgment','mixed')),
            emotional_tone TEXT NOT NULL CHECK (emotional_tone IN ('contemplative','didactic','conflictive','urgent','accusative','comforting','mixed')),
            keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
            thesis TEXT NOT NULL,
            premises JSONB NOT NULL DEFAULT '[]'::jsonb,
            antithesis TEXT NOT NULL,
            implications JSONB NOT NULL DEFAULT '[]'::jsonb,
            biblical_links JSONB NOT NULL DEFAULT '[]'::jsonb,
            warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Adjust existing analyses table
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='analyses' AND column_name='owner_id') THEN
            ALTER TABLE public.analyses ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='analyses' AND column_name='engine_version') THEN
            ALTER TABLE public.analyses ADD COLUMN engine_version TEXT NOT NULL DEFAULT 'v1';
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='analyses' AND column_name='biblical_links') THEN
            ALTER TABLE public.analyses ADD COLUMN biblical_links JSONB NOT NULL DEFAULT '[]'::jsonb;
        END IF;
        -- Convert TEXT[] to JSONB if needed
        IF (SELECT data_type FROM information_schema.columns WHERE table_name='analyses' AND column_name='keywords') = 'ARRAY' THEN
            ALTER TABLE public.analyses ALTER COLUMN keywords TYPE JSONB USING to_jsonb(keywords);
            ALTER TABLE public.analyses ALTER COLUMN premises TYPE JSONB USING to_jsonb(premises);
            ALTER TABLE public.analyses ALTER COLUMN implications TYPE JSONB USING to_jsonb(implications);
            ALTER TABLE public.analyses ALTER COLUMN warnings TYPE JSONB USING to_jsonb(warnings);
        END IF;
    END IF;
END $$;

-- 2.6 QUESTIONS
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'questions') THEN
        -- Add owner_id
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='questions' AND column_name='owner_id') THEN
            ALTER TABLE public.questions ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        -- Add updated_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='questions' AND column_name='updated_at') THEN
            ALTER TABLE public.questions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        -- Add priority
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='questions' AND column_name='priority') THEN
            ALTER TABLE public.questions ADD COLUMN priority INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5);
        END IF;
        -- Rename user_answer to user_notes if it exists (or keep both, user asked for user_notes)
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='questions' AND column_name='user_answer') THEN
            ALTER TABLE public.questions RENAME COLUMN user_answer TO user_notes;
        END IF;
        -- Handle idea_id to analysis_id migration if requested
        -- The user canonical schema says analysis_id. 
        -- To avoid breaking frontend immediately, we can keep idea_id OR add analysis_id.
        -- Let's add analysis_id and migrate if idea_id exists.
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='questions' AND column_name='analysis_id') THEN
            ALTER TABLE public.questions ADD COLUMN analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE;
            -- Migrate data if idea_id exists
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='questions' AND column_name='idea_id') THEN
                UPDATE public.questions q
                SET analysis_id = a.id
                FROM public.analyses a
                WHERE q.idea_id = a.idea_id;
                -- ALTER TABLE public.questions ALTER COLUMN analysis_id SET NOT NULL;
            END IF;
        END IF;
    ELSE
        CREATE TABLE public.questions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
            kind TEXT NOT NULL CHECK (kind IN ('structural','tension','axis','biblical','exegetical')),
            question TEXT NOT NULL,
            priority INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
            status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','parked')),
            user_notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2.7 CONNECTIONS
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'connections') THEN
        -- Add owner_id
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='connections' AND column_name='owner_id') THEN
            ALTER TABLE public.connections ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        -- Add series_id
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='connections' AND column_name='series_id') THEN
            ALTER TABLE public.connections ADD COLUMN series_id UUID REFERENCES public.series(id) ON DELETE CASCADE;
        END IF;
        -- Rename source_idea_id to from_idea_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='connections' AND column_name='source_idea_id') THEN
            ALTER TABLE public.connections RENAME COLUMN source_idea_id TO from_idea_id;
        END IF;
        -- Rename target_idea_id to to_idea_id
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name='connections' AND column_name='target_idea_id') THEN
            ALTER TABLE public.connections RENAME COLUMN target_idea_id TO to_idea_id;
        END IF;
        -- Add to_verse_ref
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='connections' AND column_name='to_verse_ref') THEN
            ALTER TABLE public.connections ADD COLUMN to_verse_ref TEXT;
        END IF;
        -- Add updated_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='connections' AND column_name='updated_at') THEN
            ALTER TABLE public.connections ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    ELSE
        CREATE TABLE public.connections (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
            from_idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
            to_idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE,
            to_verse_ref TEXT,
            relation TEXT NOT NULL CHECK (relation IN ('supports','tensions','parallels','fulfills','contrasts')),
            note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT connections_target_check CHECK ((to_idea_id IS NOT NULL) OR (to_verse_ref IS NOT NULL))
        );
    END IF;
    
    -- Ensure explicit FK names for disambiguation in PostgREST
    ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_from_idea_id_fkey;
    ALTER TABLE public.connections ADD CONSTRAINT connections_from_idea_id_fkey FOREIGN KEY (from_idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;
    
    ALTER TABLE public.connections DROP CONSTRAINT IF EXISTS connections_to_idea_id_fkey;
    ALTER TABLE public.connections ADD CONSTRAINT connections_to_idea_id_fkey FOREIGN KEY (to_idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;
END $$;

-- 2.8 CALENDAR INTEGRATIONS
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google',
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','error')),
    calendar_id_default TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.9 SCHEDULED EVENTS
CREATE TABLE IF NOT EXISTS public.scheduled_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google',
    calendar_id TEXT NOT NULL,
    provider_event_id TEXT,
    series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE SET NULL,
    idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','updated','canceled')),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FILL OWNER_ID FOR EXISTING DATA (SAFE DEFAULT)
-- If owner_id is null, try to assign to the first user in auth.users
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    IF first_user_id IS NOT NULL THEN
        UPDATE public.series SET owner_id = first_user_id WHERE owner_id IS NULL;
        UPDATE public.episodes SET owner_id = first_user_id WHERE owner_id IS NULL;
        UPDATE public.ideas SET owner_id = first_user_id WHERE owner_id IS NULL;
        UPDATE public.analyses SET owner_id = first_user_id WHERE owner_id IS NULL;
        UPDATE public.questions SET owner_id = first_user_id WHERE owner_id IS NULL;
        UPDATE public.connections SET owner_id = first_user_id WHERE owner_id IS NULL;
    END IF;
END $$;

-- Set owner_id to NOT NULL after migration
ALTER TABLE public.series ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.episodes ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.ideas ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.analyses ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.questions ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.connections ALTER COLUMN owner_id SET NOT NULL;

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_series_owner ON public.series(owner_id);
CREATE INDEX IF NOT EXISTS idx_episodes_owner ON public.episodes(owner_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON public.episodes(series_id);
CREATE INDEX IF NOT EXISTS idx_ideas_owner ON public.ideas(owner_id);
CREATE INDEX IF NOT EXISTS idx_ideas_series ON public.ideas(series_id);
CREATE INDEX IF NOT EXISTS idx_ideas_episode ON public.ideas(episode_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created ON public.ideas(created_at);
CREATE INDEX IF NOT EXISTS idx_analyses_owner ON public.analyses(owner_id);
CREATE INDEX IF NOT EXISTS idx_analyses_idea ON public.analyses(idea_id);
CREATE INDEX IF NOT EXISTS idx_questions_owner ON public.questions(owner_id);
CREATE INDEX IF NOT EXISTS idx_questions_analysis ON public.questions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_connections_owner ON public.connections(owner_id);
CREATE INDEX IF NOT EXISTS idx_connections_from ON public.connections(from_idea_id);
CREATE INDEX IF NOT EXISTS idx_connections_to ON public.connections(to_idea_id);
CREATE INDEX IF NOT EXISTS idx_connections_series ON public.connections(series_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES (DENY-BY-DEFAULT, OWNER ONLY)

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- DOMAIN TABLES HELPER MACRO (Conceptually)
-- We apply the same logic to all: owner_id = auth.uid()

-- SERIES
DROP POLICY IF EXISTS "Series owner access" ON public.series;
CREATE POLICY "Series owner access" ON public.series 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- EPISODES
DROP POLICY IF EXISTS "Episodes owner access" ON public.episodes;
CREATE POLICY "Episodes owner access" ON public.episodes 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- IDEAS
DROP POLICY IF EXISTS "Ideas owner access" ON public.ideas;
CREATE POLICY "Ideas owner access" ON public.ideas 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ANALYSES
DROP POLICY IF EXISTS "Analyses owner access" ON public.analyses;
CREATE POLICY "Analyses owner access" ON public.analyses 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- QUESTIONS
DROP POLICY IF EXISTS "Questions owner access" ON public.questions;
CREATE POLICY "Questions owner access" ON public.questions 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- CONNECTIONS
DROP POLICY IF EXISTS "Connections owner access" ON public.connections;
CREATE POLICY "Connections owner access" ON public.connections 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- CALENDAR INTEGRATIONS
DROP POLICY IF EXISTS "Calendar owner access" ON public.calendar_integrations;
CREATE POLICY "Calendar owner access" ON public.calendar_integrations 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- SCHEDULED EVENTS
DROP POLICY IF EXISTS "Events owner access" ON public.scheduled_events;
CREATE POLICY "Events owner access" ON public.scheduled_events 
    FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- 7. COMPATIBILITY VIEWS

-- View for 'analysis' (singular) compatibility
CREATE OR REPLACE VIEW public.analysis AS SELECT * FROM public.analyses;

-- 8. TRIGGERS FOR UPDATED_AT
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'series', 'episodes', 'ideas', 'analyses', 'questions', 'connections', 'calendar_integrations', 'scheduled_events')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_updated_at ON public.%I', t);
        EXECUTE format('CREATE TRIGGER tr_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    END LOOP;
END $$;

-- ===============================================================
-- G) FINAL VALIDATION QUERIES (FOR MANUAL TESTING)
-- ===============================================================
/*
-- 1. Test RLS: Should return 0 rows if not authenticated or no data for user
SELECT * FROM public.ideas;

-- 2. Test Embed Ambiguity for Connections:
-- The frontend should use explicit FK names:
-- SELECT *, connections_out:connections!connections_from_idea_id_fkey(*), connections_in:connections!connections_to_idea_id_fkey(*) FROM ideas;

-- 3. Verify owner_id requirement:
-- INSERT INTO public.ideas (input_text, input_type) VALUES ('test', 'phrase'); 
-- ^ Should FAIL if owner_id is not provided or RLS blocks it.
*/
