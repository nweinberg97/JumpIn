-- Row-level security tests for the JumpIn schema.
-- Run with:  npm run test:db   (needs a local Postgres; see scripts/test-db.sh)
--
-- Cast:
--   Ava    approved
--   Ben    approved
--   Cleo   approved, has blocked Ava
--   Dev    waitlisted (not yet let in)
--   Hana   approved, profile hidden

\set ON_ERROR_STOP on
\set QUIET on

create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', what; end if;
  raise notice 'ok - %', what;
end;
$$;

-- Runs a statement as the current role and passes only if it is refused.
create function pg_temp.expect_denied(stmt text, what text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege or check_violation or unique_violation then
    raise notice 'ok - %', what;
    return;
  end;
  raise exception 'FAIL: % (statement was allowed)', what;
end;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon, service_role;

-- ── Setup (as the database owner) ───────────────────────────────────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ava@example.test',  '{"full_name":"Ava"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test',  '{"name":"Ben"}'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.test', '{"full_name":"Cleo"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dev@example.test',  '{"full_name":"Dev"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'hana@example.test', '{"full_name":"Hana"}');

select pg_temp.expect((select count(*) from public.members) = 5, 'sign-up trigger creates a member per user');
select pg_temp.expect((select count(*) from public.member_private) = 5, 'sign-up trigger stores email privately');
select pg_temp.expect((select count(*) from public.memberships where status = 'waitlisted') = 5, 'new members start waitlisted');
select pg_temp.expect((select count(*) from public.presence where status = 'later') = 5, 'new members start "available later"');
select pg_temp.expect((select name from public.members where id = '00000000-0000-0000-0000-00000000000b') = 'Ben', 'name falls back to the "name" claim');

update public.memberships set status = 'approved'
 where member_id <> '00000000-0000-0000-0000-00000000000d';
update public.members set profile_hidden = true where id = '00000000-0000-0000-0000-0000000000a1';
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');

-- ── Ava ─────────────────────────────────────────────────────────────────────

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

select pg_temp.expect(
  (select array_agg(name order by name) from public.members) = array['Ava', 'Ben'],
  'Ava sees herself and Ben: not Cleo (blocked her), Dev (waitlisted) or Hana (hidden)');
select pg_temp.expect((select count(*) from public.presence) = 2, 'presence follows profile visibility');
select pg_temp.expect_denied('select * from public.member_private', 'Ava cannot read anyone''s email');
select pg_temp.expect_denied('select * from public.oauth_tokens', 'Ava cannot read OAuth tokens');
select pg_temp.expect_denied('select public.is_blocked_between(auth.uid(), ''00000000-0000-0000-0000-00000000000c'')',
  'Ava cannot probe who blocked whom');

update public.members set headline = 'Building climate tools' where id = auth.uid();
select pg_temp.expect((select headline from public.members where id = auth.uid()) = 'Building climate tools', 'Ava edits her own headline');
update public.members set headline = 'hacked' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select headline from public.members where id = '00000000-0000-0000-0000-00000000000b') = '', 'Ava cannot edit Ben''s profile');
select pg_temp.expect_denied('update public.members set verified = true where id = auth.uid()', 'Ava cannot mark herself verified');
select pg_temp.expect_denied('update public.memberships set status = ''approved'' where member_id = auth.uid()', 'Ava cannot change her membership');

update public.presence set status = 'open', open_until = now() + interval '30 minutes' where member_id = auth.uid();
select pg_temp.expect((select status from public.presence where member_id = auth.uid()) = 'open', 'Ava opens herself to JumpIn');
update public.presence set status = 'open' where member_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select status from public.presence where member_id = '00000000-0000-0000-0000-00000000000b') = 'later', 'Ava cannot change Ben''s status');
select pg_temp.expect_denied('update public.presence set status = ''later'', open_until = now() where member_id = auth.uid()',
  'an open_until without "open" is rejected');

select pg_temp.expect_denied(
  'insert into public.connections (initiator_id, recipient_id, type, status) values (auth.uid(), ''00000000-0000-0000-0000-00000000000b'', ''jumpin'', ''live'')',
  'Ava cannot create connections directly (the server does)');
select pg_temp.expect_denied(
  'insert into public.blocks (blocker_id, blocked_id) values (''00000000-0000-0000-0000-00000000000b'', auth.uid())',
  'Ava cannot create a block on someone else''s behalf');
commit;

-- ── Cleo (the blocker) and Dev (waitlisted) ─────────────────────────────────

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect(
  not exists (select 1 from public.members where id = '00000000-0000-0000-0000-00000000000a'),
  'blocks work both ways: Cleo no longer sees Ava');
select pg_temp.expect((select count(*) from public.blocks) = 1, 'Cleo sees the block she made');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select pg_temp.expect((select array_agg(name) from public.members) = array['Dev'], 'a waitlisted member sees only themselves');
commit;

begin;
set local role anon;
select pg_temp.expect_denied('select * from public.members', 'signed-out visitors see nothing');
commit;

-- ── The server starts a JumpIn from Ava to Ben ──────────────────────────────

begin;
set local role service_role;
insert into public.connections (id, initiator_id, recipient_id, type, status, meet_link)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
        'jumpin', 'invited', 'https://meet.google.com/abc-defg-hij');
insert into public.invites (connection_id, from_id, to_id, note)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'Hi Ben!');
select pg_temp.expect_denied(
  'insert into public.connections (initiator_id, recipient_id, type, status, meet_link) values (''00000000-0000-0000-0000-00000000000a'', ''00000000-0000-0000-0000-00000000000b'', ''jumpin'', ''live'', ''https://evil.example/'')',
  'connections only accept Google Meet links');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select count(*) from public.invites) = 1, 'Ben sees the invite addressed to him');
insert into public.call_joins (connection_id, member_id) values ('10000000-0000-0000-0000-000000000001', auth.uid());
select pg_temp.expect_denied(
  'insert into public.call_joins (connection_id, member_id) values (''10000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-00000000000a'')',
  'Ben cannot record a join for Ava');
select pg_temp.expect(not public.have_i_met('00000000-0000-0000-0000-00000000000a'), 'one join is not a meeting');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect((select count(*) from public.connections) = 0, 'Cleo cannot see Ava and Ben''s call');
select pg_temp.expect_denied(
  'insert into public.call_joins (connection_id, member_id) values (''10000000-0000-0000-0000-000000000001'', auth.uid())',
  'Cleo cannot join a call she is not part of');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into public.call_joins (connection_id, member_id) values ('10000000-0000-0000-0000-000000000001', auth.uid());
select pg_temp.expect(public.have_i_met('00000000-0000-0000-0000-00000000000b'), 'both joined: Ava and Ben have met');
commit;

-- ── Housekeeping and rate limits (server) ───────────────────────────────────

update public.presence set open_until = now() - interval '1 minute' where member_id = '00000000-0000-0000-0000-00000000000a';
insert into public.connections (id, initiator_id, recipient_id, type, status)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'jumpin', 'invited');
insert into public.invites (connection_id, from_id, to_id, note, expires_at)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'late', now() - interval '1 minute');

select public.expire_stale_state();
select pg_temp.expect((select status from public.presence where member_id = '00000000-0000-0000-0000-00000000000a') = 'later', 'expired open windows flip to "later"');
select pg_temp.expect((select status from public.invites where connection_id = '10000000-0000-0000-0000-000000000002') = 'expired', 'unanswered invites expire');
select pg_temp.expect((select status from public.connections where id = '10000000-0000-0000-0000-000000000002') = 'cancelled', 'an expired invite cancels its connection');
select pg_temp.expect((select status from public.invites where connection_id = '10000000-0000-0000-0000-000000000001') = 'pending', 'live invites are left alone');

select pg_temp.expect(
  (select array_agg(public.take_rate_limit('00000000-0000-0000-0000-00000000000a', 'invite', 3, 3600)) from generate_series(1, 4))
    = array[true, true, true, false],
  'rate limit allows 3 invites an hour, then refuses');

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_denied(
  'select public.take_rate_limit(auth.uid(), ''invite'', 1000, 60)',
  'members cannot reset or spend rate limits themselves');
commit;

-- ── Warm intros ─────────────────────────────────────────────────────────────
-- Ava becomes a Connector and introduces Ben to Hana (a member) and to Nia,
-- who isn't on JumpIn yet.

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_denied('update public.members set is_connector = true where id = auth.uid()',
  'a member cannot give themselves the Connector badge');
select pg_temp.expect_denied('select public.grant_connector(auth.uid())', 'a member cannot call grant_connector');
commit;

select public.grant_connector('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select is_connector from public.members where id = '00000000-0000-0000-0000-00000000000a'),
  'the founder grants Ava the Connector badge');

begin;
set local role service_role;
insert into public.warm_intros (id, introducer_id, subject_id, recipient_member_id, recipient_name, note, token_hash)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-0000000000a1', 'Hana', 'You two should talk about community energy.', 'hash-member');
insert into public.warm_intros (id, introducer_id, subject_id, recipient_email, recipient_name, note, token_hash)
values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
        'nia@example.test', 'Nia', 'Ben is the person I told you about.', 'hash-new');
select pg_temp.expect_denied(
  'insert into public.warm_intros (introducer_id, subject_id, recipient_name, note, token_hash) values (''00000000-0000-0000-0000-00000000000a'', ''00000000-0000-0000-0000-00000000000b'', ''Nobody'', ''x'', ''h3'')',
  'an intro needs exactly one recipient (a member or an email)');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect((select count(*) from public.warm_intros) = 2, 'Ava sees both intros she made');
select pg_temp.expect((select is_connector from public.members where id = auth.uid()), 'members can see who is a Connector');
select pg_temp.expect_denied(
  'insert into public.warm_intros (introducer_id, subject_id, recipient_email, recipient_name, note, token_hash) values (auth.uid(), ''00000000-0000-0000-0000-00000000000b'', ''x@example.test'', ''X'', ''hi'', ''h4'')',
  'intros are created by the server, not directly by members');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect((select count(*) from public.warm_intros) = 0, 'Ben cannot read the intro table (it holds Nia''s email)');
select pg_temp.expect((select count(*) from public.my_received_intros()) = 2, 'Ben sees both intros about him, without emails');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect((select count(*) from public.my_received_intros()) = 0, 'Cleo sees no intros she is not part of');
commit;

-- Someone Nia forwarded the email to signs up with their own address: the
-- intro doesn't apply to them, so they wait like anyone else.
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000f1', 'forwarded@example.test', '{"full_name":"Fran"}');
select pg_temp.expect(public.redeem_warm_intro('hash-new', '00000000-0000-0000-0000-0000000000f1') is null,
  'an intro only works for the email it was sent to');
select pg_temp.expect((select status from public.memberships where member_id = '00000000-0000-0000-0000-0000000000f1') = 'waitlisted',
  'someone with a forwarded link stays on the waitlist');
select pg_temp.expect((select status from public.warm_intros where token_hash = 'hash-new') = 'sent',
  'a refused attempt leaves the intro unused for Nia');

-- Nia signs up through her link (with different capitalisation): she skips the waitlist.
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000e1', 'Nia@Example.TEST', '{"full_name":"Nia"}');
select pg_temp.expect(public.redeem_warm_intro('hash-new', '00000000-0000-0000-0000-0000000000e1') is not null,
  'Nia redeems her intro (email match ignores capitalisation)');
select pg_temp.expect((select status from public.memberships where member_id = '00000000-0000-0000-0000-0000000000e1') = 'approved',
  'joining through a warm intro skips the waitlist');
select pg_temp.expect((select invited_by from public.memberships where member_id = '00000000-0000-0000-0000-0000000000e1') = '00000000-0000-0000-0000-00000000000a',
  'Nia is recorded as invited by Ava');
select pg_temp.expect(public.redeem_warm_intro('hash-new', '00000000-0000-0000-0000-00000000000d') is null,
  'an intro link works only once (Dev cannot reuse it to skip the waitlist)');
select pg_temp.expect(public.has_warm_intro('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000e1'),
  'Ben and Nia now count as warmly introduced');

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_denied('select public.redeem_warm_intro(''hash-member'', auth.uid())', 'members cannot redeem intros directly');
commit;

-- ── Launch settings ─────────────────────────────────────────────────────────

begin;
set local role anon;
select pg_temp.expect((select count(*) from public.launch_settings) = 1, 'anyone can read the launch date (for the countdown)');
select pg_temp.expect(not public.is_launched(), 'nothing is open before a launch date is set');
select pg_temp.expect_denied('select launch_email_sent_at from public.launch_settings', 'internal launch fields stay private');
commit;

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_denied('update public.launch_settings set opened_at = now()', 'members cannot open calls themselves');
commit;

update public.launch_settings set launch_at = now() + interval '3 days';
select pg_temp.expect(not public.is_launched(), 'before the countdown ends, calls stay closed');
update public.launch_settings set launch_at = now() - interval '1 minute';
select pg_temp.expect(public.is_launched(), 'when the countdown ends, calls open');
update public.launch_settings set launch_at = now() + interval '3 days', opened_at = now();
select pg_temp.expect(public.is_launched(), 'the founder can open early');
update public.launch_settings set launch_at = null, opened_at = null;

select pg_temp.expect(
  (select public.profile_gaps(m) from public.members m where m.id = '00000000-0000-0000-0000-00000000000d')
    = array['photo', 'headline', 'what I do', 'about', 'impact areas', 'onboarding'],
  'profile_gaps lists what a new member still needs');

-- ── Email log ───────────────────────────────────────────────────────────────

insert into public.email_log (member_id, kind) values ('00000000-0000-0000-0000-00000000000a', 'welcome');
select pg_temp.expect_denied(
  $$insert into public.email_log (member_id, kind) values ('00000000-0000-0000-0000-00000000000a', 'welcome')$$,
  'a once-only email cannot be logged twice');

begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_denied('select * from public.email_log', 'members cannot read the email log');
commit;

\warn 'All RLS tests passed.'
