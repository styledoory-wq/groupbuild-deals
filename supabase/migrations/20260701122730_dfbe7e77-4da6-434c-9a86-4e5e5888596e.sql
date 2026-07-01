CREATE TABLE public.image_migration_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        text NOT NULL,
  bucket        text NOT NULL,
  old_path      text NOT NULL,
  old_url       text NOT NULL,
  new_path      text,
  new_url       text,
  old_bytes     bigint,
  new_bytes     bigint,
  table_name    text NOT NULL,
  column_name   text NOT NULL,
  row_id        text NOT NULL,
  status        text NOT NULL CHECK (status IN ('ok','failed','skipped')),
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX image_migration_log_run_idx ON public.image_migration_log(run_id, status);
CREATE INDEX image_migration_log_lookup_idx ON public.image_migration_log(table_name, column_name, row_id);
CREATE UNIQUE INDEX image_migration_log_unique_ok
  ON public.image_migration_log(bucket, old_path, table_name, column_name, row_id)
  WHERE status = 'ok';

GRANT SELECT ON public.image_migration_log TO authenticated;
GRANT ALL    ON public.image_migration_log TO service_role;

ALTER TABLE public.image_migration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view migration log"
ON public.image_migration_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));