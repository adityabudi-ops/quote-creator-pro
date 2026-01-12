-- Revoke EXECUTE permissions on security definer functions from public roles
-- This prevents direct RPC invocation while still allowing RLS policy usage

-- Revoke from anon and authenticated roles (public API users)
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_user_role(uuid, user_role) FROM anon, authenticated;

-- Grant execute only to postgres (superuser) which is what RLS policies run as
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.has_user_role(uuid, user_role) TO postgres;

-- Add comments documenting these are internal-only functions
COMMENT ON FUNCTION public.get_user_role(uuid) IS 'INTERNAL ONLY: Returns user role. Not callable via RPC - used only in RLS policies.';
COMMENT ON FUNCTION public.has_user_role(uuid, user_role) IS 'INTERNAL ONLY: Checks if user has specific role. Not callable via RPC - used only in RLS policies.';