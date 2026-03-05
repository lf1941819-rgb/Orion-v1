-- SQL Schema for Orion Lab (Supabase) - Canonical Multi-User Version

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Series Table
CREATE TABLE IF NOT EXISTS public.series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Episodes Table
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    series_id UUID NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ideas (Núcleos) Table
CREATE TABLE IF NOT EXISTS public.ideas (
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

-- 5. Analyses Table (Linked to Ideas)
CREATE TABLE IF NOT EXISTS public.analyses (
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

-- 6. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
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

-- 7. Connections Table
CREATE TABLE IF NOT EXISTS public.connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
    from_idea_id UUID NOT NULL,
    to_idea_id UUID,
    to_verse_ref TEXT,
    relation TEXT NOT NULL CHECK (relation IN ('supports','tensions','parallels','fulfills','contrasts')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT connections_target_check CHECK ((to_idea_id IS NOT NULL) OR (to_verse_ref IS NOT NULL)),
    CONSTRAINT connections_from_idea_id_fkey FOREIGN KEY (from_idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE,
    CONSTRAINT connections_to_idea_id_fkey FOREIGN KEY (to_idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE
);

-- 8. Calendar Integrations
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google',
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected','connected','error')),
    calendar_id_default TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Scheduled Events
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_series_owner ON public.series(owner_id);
CREATE INDEX IF NOT EXISTS idx_episodes_owner ON public.episodes(owner_id);
CREATE INDEX IF NOT EXISTS idx_ideas_owner ON public.ideas(owner_id);
CREATE INDEX IF NOT EXISTS idx_analyses_owner ON public.analyses(owner_id);
CREATE INDEX IF NOT EXISTS idx_questions_owner ON public.questions(owner_id);
CREATE INDEX IF NOT EXISTS idx_connections_owner ON public.connections(owner_id);

-- RLS ENABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Owner access" ON public.series FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner access" ON public.episodes FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner access" ON public.ideas FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner access" ON public.analyses FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner access" ON public.questions FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner access" ON public.connections FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner access" ON public.calendar_integrations FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner access" ON public.scheduled_events FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Profile access" ON public.profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- COMPATIBILITY VIEW
CREATE OR REPLACE VIEW public.analysis AS SELECT * FROM public.analyses;

-- TRIGGERS
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'series', 'episodes', 'ideas', 'analyses', 'questions', 'connections', 'calendar_integrations', 'scheduled_events')
    LOOP
        EXECUTE format('CREATE TRIGGER tr_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    END LOOP;
END $$;

