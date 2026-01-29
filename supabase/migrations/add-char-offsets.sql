-- Migration: Add character offset columns for precise citation highlighting
-- These columns enable the PDF viewer to scroll to and highlight the exact
-- location of cited text within a page.

-- Add char_offset_start: The starting character position within the page
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS char_offset_start INT;

-- Add char_offset_end: The ending character position within the page
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS char_offset_end INT;

-- Add index for faster lookups when querying by document and page
CREATE INDEX IF NOT EXISTS idx_chunks_document_page
ON chunks(document_id, page_number);

-- Comment on columns for documentation
COMMENT ON COLUMN chunks.char_offset_start IS 'Starting character position within the page text for citation highlighting';
COMMENT ON COLUMN chunks.char_offset_end IS 'Ending character position within the page text for citation highlighting';
