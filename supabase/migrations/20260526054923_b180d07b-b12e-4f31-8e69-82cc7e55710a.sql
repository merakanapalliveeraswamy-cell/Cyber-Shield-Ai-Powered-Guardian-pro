DROP POLICY IF EXISTS "Parents can update family" ON public.family_members;

CREATE POLICY "Parents can update family"
ON public.family_members
FOR UPDATE
TO authenticated
USING (auth.uid() = parent_user_id AND linked_user_id IS NULL)
WITH CHECK (auth.uid() = parent_user_id AND linked_user_id IS NULL);