-- ============================================================
-- 1. CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📦',
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active categories" ON public.categories;
CREATE POLICY "Public can read active categories"
  ON public.categories FOR SELECT
  USING (is_active = true AND is_deleted = false);

DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;
CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed (idempotent)
INSERT INTO public.categories (id, name, icon, display_order) VALUES
  ('architect','אדריכל','📐',10),
  ('interior-designer','מעצב פנים','🎨',20),
  ('consultant','יועצים (קרקע/אקוסטיקה)','📋',30),
  ('contractor','קבלן ראשי','👷',40),
  ('skeleton','קבלן שלד','🏗️',50),
  ('gypsum','גבס ובנייה קלה','🧱',60),
  ('electric','חשמל ושדרוגים','⚡',70),
  ('plumbing','אינסטלציה','🔧',80),
  ('ac','מיזוג אוויר','❄️',90),
  ('smart-home','בית חכם','📱',100),
  ('windows','חלונות ותריסים','🪟',110),
  ('doors','דלתות פנים','🚪',120),
  ('security-door','דלתות כניסה / פלדה','🛡️',130),
  ('flooring','פרקט / ריצוף','🪵',140),
  ('cladding','חיפויי קיר','🪨',150),
  ('painting','צבע וטיח','🎨',160),
  ('kitchen','מטבחים','🍳',170),
  ('bath','ארונות אמבט','🛁',180),
  ('showers','מקלחונים','🚿',190),
  ('sanitary','כלים סניטריים','🚽',200),
  ('carpentry','נגרות מותאמת','🪚',210),
  ('closets','ארונות קיר','🚪',220),
  ('lighting','תאורה','💡',230),
  ('garden','גינון ופיתוח חוץ','🌿',240),
  ('pergola','פרגולות וצל','⛱️',250),
  ('cleaning','ניקיון לאחר בנייה','🧹',260)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. SOFT DELETE on waitlist_leads
-- ============================================================
ALTER TABLE public.waitlist_leads
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ============================================================
-- 3. NOTIFICATION TRIGGERS
-- ============================================================

-- Helper: insert a notification for every admin user
CREATE OR REPLACE FUNCTION public.notify_admins(
  _title text,
  _body text,
  _type text,
  _link text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, link, metadata)
  SELECT ur.user_id, _title, _body, _type, _link, _metadata
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::app_role;
END;
$$;

-- Helper: insert a notification for a specific user
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid,
  _title text,
  _body text,
  _type text,
  _link text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, title, body, type, link, metadata)
  VALUES (_user_id, _title, _body, _type, _link, _metadata);
END;
$$;

-- Trigger: new deal interest → notify admins + supplier owning the deal
CREATE OR REPLACE FUNCTION public.trg_notify_deal_interest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_supplier_user uuid;
  v_deal_title text;
BEGIN
  SELECT s.user_id, d.title INTO v_supplier_user, v_deal_title
  FROM public.deals d
  LEFT JOIN public.suppliers s ON s.id = d.supplier_id
  WHERE d.id::text = NEW.deal_id
  LIMIT 1;

  PERFORM public.notify_admins(
    'דייר חדש הצטרף להצעה',
    COALESCE(NEW.full_name, 'דייר') || ' הצטרף להצעה: ' || COALESCE(v_deal_title, NEW.deal_id),
    'deal',
    '/admin/leads',
    jsonb_build_object('deal_id', NEW.deal_id, 'interest_id', NEW.id)
  );

  IF v_supplier_user IS NOT NULL THEN
    PERFORM public.notify_user(
      v_supplier_user,
      'ליד חדש להצעה שלך',
      COALESCE(NEW.full_name, 'דייר') || ' הביע עניין בהצעה: ' || COALESCE(v_deal_title, ''),
      'deal',
      '/supplier/leads',
      jsonb_build_object('deal_id', NEW.deal_id, 'interest_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_on_deal_interest ON public.deal_interests;
CREATE TRIGGER notify_on_deal_interest
  AFTER INSERT ON public.deal_interests
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deal_interest();

-- Trigger: new supplier → notify admins
CREATE OR REPLACE FUNCTION public.trg_notify_new_supplier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins(
    'ספק חדש נרשם',
    'ספק חדש: ' || COALESCE(NEW.business_name, 'ללא שם'),
    'system',
    '/admin/suppliers',
    jsonb_build_object('supplier_id', NEW.id)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_on_new_supplier ON public.suppliers;
CREATE TRIGGER notify_on_new_supplier
  AFTER INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_supplier();

-- Trigger: new waitlist lead → notify admins
CREATE OR REPLACE FUNCTION public.trg_notify_new_waitlist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_admins(
    'ליד חדש מהאתר',
    COALESCE(NEW.full_name, 'ללא שם') || ' (' || COALESCE(NEW.lead_type, '') || ')',
    'system',
    '/admin/leads',
    jsonb_build_object('lead_id', NEW.id, 'lead_type', NEW.lead_type)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_on_new_waitlist ON public.waitlist_leads;
CREATE TRIGGER notify_on_new_waitlist
  AFTER INSERT ON public.waitlist_leads
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_waitlist();

-- Trigger: deposit status change → notify resident + admins
CREATE OR REPLACE FUNCTION public.trg_notify_deposit_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'פיקדון חדש בהמתנה',
      'סכום: ' || NEW.amount::text || ' ש״ח',
      'deposit',
      '/admin/deposits',
      jsonb_build_object('deposit_id', NEW.id, 'deal_id', NEW.deal_id)
    );
    PERFORM public.notify_user(
      NEW.user_id,
      'הפיקדון נרשם',
      'הפיקדון שלך התקבל וממתין לאישור.',
      'deposit',
      '/my-offers',
      jsonb_build_object('deposit_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status::text = 'paid' THEN
      PERFORM public.notify_user(
        NEW.user_id,
        'הפיקדון אושר',
        'הפיקדון שלך אושר וההצטרפות שלך להצעה הושלמה.',
        'deposit',
        '/my-offers',
        jsonb_build_object('deposit_id', NEW.id)
      );
    ELSIF NEW.status::text = 'refunded' THEN
      PERFORM public.notify_user(
        NEW.user_id,
        'הפיקדון הוחזר',
        'הפיקדון שלך הוחזר.',
        'deposit',
        '/my-offers',
        jsonb_build_object('deposit_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS notify_on_deposit_change ON public.deposits;
CREATE TRIGGER notify_on_deposit_change
  AFTER INSERT OR UPDATE OF status ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deposit_change();