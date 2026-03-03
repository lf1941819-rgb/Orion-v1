-- ============================================
-- ORION LAB - Supabase SQL (Schema + RLS)
-- ============================================

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Helper trigger function (secure search_path)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 3) TABLES
-- ============================================

-- Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_profiles_updated_at'
  ) THEN
    CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;


-- Series
CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,

  axis text CHECK (axis IN ('truth', 'justice', 'judgment', 'mixed')),
  type text CHECK (type IN ('ontological', 'juridical', 'narrative', 'pastoral', 'mixed')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_series_updated_at'
  ) THEN
    CREATE TRIGGER tr_series_updated_at
    BEFORE UPDATE ON public.series
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;


-- Episodes (owned via Series)
CREATE TABLE IF NOT EXISTS public.episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text,

  axis text CHECK (axis IN ('truth', 'justice', 'judgment', 'mixed')),
  type text CHECK (type IN ('ontological', 'juridical', 'narrative', 'pastoral', 'mixed')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_episodes_updated_at'
  ) THEN
    CREATE TRIGGER tr_episodes_updated_at
    BEFORE UPDATE ON public.episodes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;


-- Ideas (Núcleos) - explicit owner for clean multi-user + allows no series/episode
CREATE TABLE IF NOT EXISTS public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  input_text text NOT NULL,
  input_type text,
  detected_verse_ref text,

  series_id uuid REFERENCES public.series(id) ON DELETE SET NULL,
  episode_id uuid REFERENCES public.episodes(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_ideas_updated_at'
  ) THEN
    CREATE TRIGGER tr_ideas_updated_at
    BEFORE UPDATE ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;


-- Analysis (Linked to Ideas)
CREATE TABLE IF NOT EXISTS public.analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,

  claim_type text,
  axis text,
  emotional_tone text,

  thesis text,
  antithesis text,

  premises text[],
  implications text[],
  keywords text[],
  warnings text[],

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: enforce at most one analysis per idea
CREATE UNIQUE INDEX IF NOT EXISTS ux_analysis_idea_id ON public.analysis(idea_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_analysis_updated_at'
  ) THEN
    CREATE TRIGGER tr_analysis_updated_at
    BEFORE UPDATE ON public.analysis
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;


-- Questions (Linked to Ideas)
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,

  kind text CHECK (kind IN ('structural', 'tension', 'axis', 'biblical', 'exegetical')),
  question text NOT NULL,

  user_answer text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'parked')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_questions_updated_at'
  ) THEN
    CREATE TRIGGER tr_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;


-- Connections (Idea ↔ Idea)
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  target_idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,

  relation text NOT NULL,
  note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_connections_no_self_link CHECK (source_idea_id <> target_idea_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_connections_updated_at'
  ) THEN
    CREATE TRIGGER tr_connections_updated_at
    BEFORE UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;


-- ============================================
-- 4) INDEXES (Performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_series_user_id        ON public.series(user_id);
CREATE INDEX IF NOT EXISTS idx_episodes_series_id    ON public.episodes(series_id);

CREATE INDEX IF NOT EXISTS idx_ideas_user_id         ON public.ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_series_id       ON public.ideas(series_id);
CREATE INDEX IF NOT EXISTS idx_ideas_episode_id      ON public.ideas(episode_id);

CREATE INDEX IF NOT EXISTS idx_questions_idea_id     ON public.questions(idea_id);

CREATE INDEX IF NOT EXISTS idx_connections_source    ON public.connections(source_idea_id);
CREATE INDEX IF NOT EXISTS idx_connections_target    ON public.connections(target_idea_id);


-- ============================================
-- 5) RLS + POLICIES
-- ============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);


-- SERIES
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "series_select_own" ON public.series;
CREATE POLICY "series_select_own"
ON public.series
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "series_insert_own" ON public.series;
CREATE POLICY "series_insert_own"
ON public.series
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "series_update_own" ON public.series;
CREATE POLICY "series_update_own"
ON public.series
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "series_delete_own" ON public.series;
CREATE POLICY "series_delete_own"
ON public.series
FOR DELETE
USING (auth.uid() = user_id);


-- EPISODES (ownership via series.user_id)
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "episodes_select_by_series_owner" ON public.episodes;
CREATE POLICY "episodes_select_by_series_owner"
ON public.episodes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.series s
    WHERE s.id = episodes.series_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "episodes_insert_by_series_owner" ON public.episodes;
CREATE POLICY "episodes_insert_by_series_owner"
ON public.episodes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.series s
    WHERE s.id = episodes.series_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "episodes_update_by_series_owner" ON public.episodes;
CREATE POLICY "episodes_update_by_series_owner"
ON public.episodes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.series s
    WHERE s.id = episodes.series_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.series s
    WHERE s.id = episodes.series_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "episodes_delete_by_series_owner" ON public.episodes;
CREATE POLICY "episodes_delete_by_series_owner"
ON public.episodes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.series s
    WHERE s.id = episodes.series_id
      AND s.user_id = auth.uid()
  )
);


-- IDEAS (explicit owner)
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ideas_select_own" ON public.ideas;
CREATE POLICY "ideas_select_own"
ON public.ideas
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ideas_insert_own" ON public.ideas;
CREATE POLICY "ideas_insert_own"
ON public.ideas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ideas_update_own" ON public.ideas;
CREATE POLICY "ideas_update_own"
ON public.ideas
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ideas_delete_own" ON public.ideas;
CREATE POLICY "ideas_delete_own"
ON public.ideas
FOR DELETE
USING (auth.uid() = user_id);


-- ANALYSIS (ownership via ideas.user_id)
ALTER TABLE public.analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analysis_select_by_idea_owner" ON public.analysis;
CREATE POLICY "analysis_select_by_idea_owner"
ON public.analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = analysis.idea_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "analysis_insert_by_idea_owner" ON public.analysis;
CREATE POLICY "analysis_insert_by_idea_owner"
ON public.analysis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = analysis.idea_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "analysis_update_by_idea_owner" ON public.analysis;
CREATE POLICY "analysis_update_by_idea_owner"
ON public.analysis
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = analysis.idea_id
      AND i.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = analysis.idea_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "analysis_delete_by_idea_owner" ON public.analysis;
CREATE POLICY "analysis_delete_by_idea_owner"
ON public.analysis
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = analysis.idea_id
      AND i.user_id = auth.uid()
  )
);


-- QUESTIONS (ownership via ideas.user_id)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_select_by_idea_owner" ON public.questions;
CREATE POLICY "questions_select_by_idea_owner"
ON public.questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = questions.idea_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "questions_insert_by_idea_owner" ON public.questions;
CREATE POLICY "questions_insert_by_idea_owner"
ON public.questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = questions.idea_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "questions_update_by_idea_owner" ON public.questions;
CREATE POLICY "questions_update_by_idea_owner"
ON public.questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = questions.idea_id
      AND i.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = questions.idea_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "questions_delete_by_idea_owner" ON public.questions;
CREATE POLICY "questions_delete_by_idea_owner"
ON public.questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ideas i
    WHERE i.id = questions.idea_id
      AND i.user_id = auth.uid()
  )
);


-- CONNECTIONS (both ideas must belong to user)
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connections_select_own_graph" ON public.connections;
CREATE POLICY "connections_select_own_graph"
ON public.connections
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.ideas s WHERE s.id = connections.source_idea_id AND s.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM public.ideas t WHERE t.id = connections.target_idea_id AND t.user_id = auth.uid())
);

DROP POLICY IF EXISTS "connections_insert_own_graph" ON public.connections;
CREATE POLICY "connections_insert_own_graph"
ON public.connections
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.ideas s WHERE s.id = connections.source_idea_id AND s.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM public.ideas t WHERE t.id = connections.target_idea_id AND t.user_id = auth.uid())
);

DROP POLICY IF EXISTS "connections_update_own_graph" ON public.connections;
CREATE POLICY "connections_update_own_graph"
ON public.connections
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.ideas s WHERE s.id = connections.source_idea_id AND s.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM public.ideas t WHERE t.id = connections.target_idea_id AND t.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.ideas s WHERE s.id = connections.source_idea_id AND s.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM public.ideas t WHERE t.id = connections.target_idea_id AND t.user_id = auth.uid())
);

DROP POLICY IF EXISTS "connections_delete_own_graph" ON public.connections;
CREATE POLICY "connections_delete_own_graph"
ON public.connections
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.ideas s WHERE s.id = connections.source_idea_id AND s.user_id = auth.uid())
  AND
  EXISTS (SELECT 1 FROM public.ideas t WHERE t.id = connections.target_idea_id AND t.user_id = auth.uid())
);

-- ============================================
-- Storage (optional; leave commented until you create bucket)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
-- CREATE POLICY "avatars_public_read"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'avatars');

-- DROP POLICY IF EXISTS "avatars_owner_write" ON storage.objects;
-- CREATE POLICY "avatars_owner_write"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
-- CREATE POLICY "avatars_owner_update"
-- ON storage.objects FOR UPDATE
-- USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
-- WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
-- CREATE POLICY "avatars_owner_delete"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');