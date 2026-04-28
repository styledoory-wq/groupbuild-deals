-- Allow anonymous (landing page visitors) to read regions and cities for the waitlist form
CREATE POLICY "Anyone can read regions"
ON public.regions FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can read cities"
ON public.cities FOR SELECT
TO anon
USING (true);