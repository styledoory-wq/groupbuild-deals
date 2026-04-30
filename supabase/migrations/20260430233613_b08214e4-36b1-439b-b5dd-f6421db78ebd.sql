
-- Create documents table
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  file_size bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all documents" ON public.documents FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resident-documents', 'resident-documents', false);

CREATE POLICY "Users upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resident-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own documents storage" ON storage.objects FOR SELECT USING (bucket_id = 'resident-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own documents storage" ON storage.objects FOR DELETE USING (bucket_id = 'resident-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins manage documents storage" ON storage.objects FOR ALL USING (bucket_id = 'resident-documents' AND has_role(auth.uid(), 'admin'::app_role));
