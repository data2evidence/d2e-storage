-- Disable Row Level Security on storage.objects table
-- This allows unrestricted access to objects (use with caution in production)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Create a public view that exposes all storage.objects columns
-- This provides an easier way to query objects from the public schema
CREATE OR REPLACE VIEW public.objects AS 
SELECT * FROM storage.objects;

-- Grant all permissions on the public.objects view to service_role
-- This ensures the service role can perform all operations on objects
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objects TO service_role;

-- Optional: Grant permissions to authenticated users if needed
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objects TO authenticated;

-- Optional: Grant read-only access to anonymous users if needed
GRANT SELECT ON public.objects TO anon;

