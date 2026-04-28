CREATE TABLE public.waitlist_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('resident','supplier')),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  project_name TEXT,
  business_name TEXT,
  service_areas TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit to waitlist"
ON public.waitlist_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins manage waitlist"
ON public.waitlist_leads
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));