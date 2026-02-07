-- Migration: Section-Aware Search Boost
-- Purpose: Boost chunks matching section references (e.g., "5.5", "1.4") in queries
--
-- When a user asks "what does section 5.5 say?", chunks whose section_title
-- starts with "5.5" get a +0.5 additive boost to their combined_score.
-- This is additive (not a hard filter) so related sections still surface.

-- ============================================================================
-- Step 1: Drop existing function to change signature
-- ============================================================================

DROP FUNCTION IF EXISTS hybrid_search_chunks(text, vector(1024), int, float, float, bigint[]);

-- ============================================================================
-- Step 2: Recreate with section boost parameter
-- ============================================================================

CREATE OR REPLACE FUNCTION hybrid_search_chunks(
  query_text text,
  query_embedding vector(1024),
  match_count int DEFAULT 10,
  bm25_weight float DEFAULT 0.3,
  vector_weight float DEFAULT 0.7,
  filter_document_ids bigint[] DEFAULT NULL,
  filter_section_refs text[] DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  document_id bigint,
  content text,
  page_number int,
  char_offset_start int,
  char_offset_end int,
  section_title text,
  chunk_type text,
  has_codes boolean,
  bm25_score float,
  vector_score float,
  combined_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
  -- Detect if query contains property keywords that benefit from table data
  has_property_keyword boolean;
  -- Build section regex pattern from refs array
  section_pattern text;
BEGIN
  -- Check for chemical/mechanical property keywords in query
  has_property_keyword := (
    query_text ~* '\y(yield|tensile|hardness|carbon|chromium|molybdenum|nitrogen|nickel|composition|chemical|mechanical|elongation|charpy|pren|ferrite|heat treatment|annealing|solution)\y'
  );

  -- Build section regex: "^(5\.5|1\.4)" from array ['5.5', '1.4']
  -- Escape dots for regex and anchor to start of section_title
  IF filter_section_refs IS NOT NULL AND array_length(filter_section_refs, 1) > 0 THEN
    section_pattern := '^(' || array_to_string(
      ARRAY(SELECT replace(unnest(filter_section_refs), '.', '\.') ), '|'
    ) || ')';
  END IF;

  RETURN QUERY
  WITH
  -- BM25-style full-text search
  bm25_results AS (
    SELECT
      c.id,
      c.document_id,
      c.content,
      c.page_number,
      c.char_offset_start,
      c.char_offset_end,
      c.section_title,
      c.chunk_type,
      c.has_codes,
      ts_rank_cd(c.search_vector, plainto_tsquery('english', query_text), 32) AS score
    FROM chunks c
    WHERE c.search_vector @@ plainto_tsquery('english', query_text)
      AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
  ),
  -- Vector similarity search
  vector_results AS (
    SELECT
      c.id,
      c.document_id,
      c.content,
      c.page_number,
      c.char_offset_start,
      c.char_offset_end,
      c.section_title,
      c.chunk_type,
      c.has_codes,
      (1 - (c.embedding <=> query_embedding)) AS score
    FROM chunks c
    WHERE c.embedding IS NOT NULL
      AND (1 - (c.embedding <=> query_embedding)) > 0.3
      AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
  ),
  -- Combine unique chunk IDs
  all_chunk_ids AS (
    SELECT b.id FROM bm25_results b
    UNION
    SELECT v.id FROM vector_results v
  ),
  -- Score with metadata boosting, property-aware table boost, and section boost
  scored_results AS (
    SELECT
      a.id,
      c.document_id,
      c.content,
      c.page_number,
      c.char_offset_start,
      c.char_offset_end,
      c.section_title,
      c.chunk_type,
      c.has_codes,
      COALESCE(b.score, 0)::float AS bm25_score,
      COALESCE(v.score, 0)::float AS vector_score,
      (
        -- Base hybrid score
        ((bm25_weight * COALESCE(b.score, 0)) + (vector_weight * COALESCE(v.score, 0)))
        *
        -- Multiplicative boost for tables on property queries
        (CASE
          WHEN c.chunk_type = 'table' AND has_property_keyword THEN 1.25
          ELSE 1.0
        END)
        +
        -- Additional metadata boosts (additive)
        (CASE WHEN c.has_codes THEN 0.1 ELSE 0 END) +
        (CASE WHEN c.chunk_type = 'table' AND NOT has_property_keyword THEN 0.05 ELSE 0 END) +
        -- Section title boost: +0.5 when chunk's section matches requested section
        (CASE
          WHEN section_pattern IS NOT NULL
            AND c.section_title IS NOT NULL
            AND c.section_title ~ section_pattern
          THEN 0.5
          ELSE 0
        END)
      )::float AS combined_score
    FROM all_chunk_ids a
    JOIN chunks c ON c.id = a.id
    LEFT JOIN bm25_results b ON b.id = a.id
    LEFT JOIN vector_results v ON v.id = a.id
  )
  SELECT
    sr.id,
    sr.document_id,
    sr.content,
    sr.page_number,
    sr.char_offset_start,
    sr.char_offset_end,
    sr.section_title,
    sr.chunk_type,
    sr.has_codes,
    sr.bm25_score,
    sr.vector_score,
    sr.combined_score
  FROM scored_results sr
  WHERE sr.combined_score > 0
  ORDER BY sr.combined_score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Step 3: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO anon, authenticated;

-- ============================================================================
-- Step 4: Comments
-- ============================================================================

COMMENT ON FUNCTION hybrid_search_chunks IS 'Hybrid search with property-aware table boosting and section-aware boosting. When filter_section_refs is provided, chunks whose section_title matches get a +0.5 boost.';
