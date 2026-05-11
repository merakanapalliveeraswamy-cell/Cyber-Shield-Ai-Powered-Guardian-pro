-- Restrict direct execution of SECURITY DEFINER helpers via PostgREST
REVOKE EXECUTE ON FUNCTION public.is_parent_of(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Realtime channel topic authorization: users can only subscribe to their own alerts channel
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to own alerts channel" ON realtime.messages;
CREATE POLICY "Users subscribe to own alerts channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'alerts-realtime-' || (auth.uid())::text
);
