create or replace function public.sitemap_city_category_combos()
returns table(city_slug text, category_slug text, supplier_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select ci.slug as city_slug, cat.slug as category_slug, s.id as supplier_id,
      (s.logo_url is not null and coalesce(nullif(s.short_description, ''), null) is not null) as is_full
    from public.suppliers s
    join public.supplier_categories sc on sc.supplier_id = s.id
    join public.categories cat on cat.id = sc.category_id
    join public.supplier_cities scy on scy.supplier_id = s.id
    join public.cities ci on ci.id = scy.city_id
    where s.is_active = true
      and coalesce(s.is_deleted, false) = false
      and s.approval_status = any (array['approved','active'])
      and cat.is_active = true
      and coalesce(cat.is_deleted, false) = false
      and ci.slug is not null and cat.slug is not null
    union
    select ci.slug, cat.slug, s.id,
      (s.logo_url is not null and coalesce(nullif(s.short_description, ''), null) is not null)
    from public.suppliers s
    join public.supplier_categories sc on sc.supplier_id = s.id
    join public.categories cat on cat.id = sc.category_id
    cross join public.cities ci
    where s.is_active = true
      and coalesce(s.is_deleted, false) = false
      and s.approval_status = any (array['approved','active'])
      and s.serves_all_country = true
      and cat.is_active = true
      and coalesce(cat.is_deleted, false) = false
      and ci.slug is not null and cat.slug is not null
  )
  select city_slug, category_slug, count(distinct supplier_id) as supplier_count
  from base
  group by city_slug, category_slug
  having count(distinct supplier_id) >= 3 and bool_or(is_full);
$$;

grant execute on function public.sitemap_city_category_combos() to anon, authenticated, service_role;

create or replace function public.city_category_qualifies(_city_slug text, _category_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sitemap_city_category_combos() c
    where c.city_slug = _city_slug and c.category_slug = _category_slug
  );
$$;

grant execute on function public.city_category_qualifies(text, text) to anon, authenticated, service_role;

-- Add phone_impression to allowed event types
alter table public.supplier_analytics_events drop constraint if exists supplier_analytics_events_event_type_check;
alter table public.supplier_analytics_events add constraint supplier_analytics_events_event_type_check
  check (event_type in (
    'view','call','reveal_phone','phone_impression','whatsapp','website','navigate',
    'open_project','favorite_attempt','gallery_open','deal_click','share'
  ));