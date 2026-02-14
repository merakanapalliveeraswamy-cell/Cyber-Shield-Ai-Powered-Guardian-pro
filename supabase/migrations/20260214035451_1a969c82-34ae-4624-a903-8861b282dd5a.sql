
-- Add DELETE policy for wellbeing_checkins
CREATE POLICY "Users can delete own checkins"
  ON public.wellbeing_checkins
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add DELETE policy for alerts
CREATE POLICY "Users can delete own alerts"
  ON public.alerts
  FOR DELETE
  USING (auth.uid() = user_id);
