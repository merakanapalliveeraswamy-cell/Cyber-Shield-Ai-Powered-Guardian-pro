DROP POLICY IF EXISTS "Parents can add family" ON public.family_members;
DROP POLICY IF EXISTS "Parents can update family" ON public.family_members;

CREATE POLICY "Parents can add family"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = parent_user_id
  AND linked_user_id IS NULL
);

CREATE POLICY "Parents can update family"
ON public.family_members
FOR UPDATE
TO authenticated
USING (auth.uid() = parent_user_id)
WITH CHECK (
  auth.uid() = parent_user_id
  AND linked_user_id IS NULL
);