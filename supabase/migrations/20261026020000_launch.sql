-- ─────────────────────────────────────────────────────────────────────────────
-- Onboarding mode and launch
--
-- Before launch, the founder onboards people one by one: they sign in, build
-- their profile, and are approved. Calling stays off until launch, when a
-- countdown ends (launch_at) or the founder opens it early (opened_at), and
-- a launch email goes to every approved member.
--
-- One row. Anyone may read when launch is (the landing page shows the
-- countdown); only the server changes it.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.launch_settings (
  id                   boolean primary key default true check (id),
  launch_at            timestamptz,
  opened_at            timestamptz,
  launch_email_sent_at timestamptz,
  updated_at           timestamptz not null default now()
);
insert into public.launch_settings (id) values (true);

create trigger launch_settings_touch before update on public.launch_settings
  for each row execute function public.touch_updated_at();

alter table public.launch_settings enable row level security;
revoke all on public.launch_settings from anon, authenticated;
grant select (launch_at, opened_at) on public.launch_settings to anon, authenticated;
create policy launch_settings_read on public.launch_settings
  for select to anon, authenticated using (true);

-- Calls are open: the founder opened them, or the countdown has ended.
create function public.is_launched()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.opened_at is not null or (s.launch_at is not null and s.launch_at <= now())
       from public.launch_settings s where s.id),
    false);
$$;
revoke execute on function public.is_launched() from public;
grant execute on function public.is_launched() to anon, authenticated;

-- Profile completeness, for the founder's onboarding view: what's missing
-- before this person is ready to be approved.
create function public.profile_gaps(m public.members)
returns text[] language sql stable set search_path = '' as $$
  select array_remove(array[
    case when m.avatar_url is null or m.avatar_url = '' then 'photo' end,
    case when m.headline = '' then 'headline' end,
    case when m.what_i_do = '' then 'what I do' end,
    case when m.bio = '' then 'about' end,
    case when cardinality(m.impact_areas) = 0 then 'impact areas' end,
    case when not m.onboarded then 'onboarding' end
  ], null);
$$;
