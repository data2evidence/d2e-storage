-- Create default buckets needed by the portal service
-- This ensures buckets exist before any file operations

-- Create portal-datasets-resources bucket for dataset files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portal-datasets-resources',
  'portal-datasets-resources',
  false,
  NULL,  -- no size limit
  NULL   -- allow all mime types
)
ON CONFLICT (id) DO NOTHING;

-- Create data-transformation bucket for data transformation files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'data-transformation',
  'data-transformation',
  false,
  NULL,  -- no size limit
  NULL   -- allow all mime types
)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions on buckets to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO authenticated;

-- Grant read access to anon users
GRANT SELECT ON storage.buckets TO anon;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Default buckets created successfully';
END $$;

