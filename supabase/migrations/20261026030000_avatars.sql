-- ─────────────────────────────────────────────────────────────────────────────
-- Profile photos: a public bucket where each member writes only inside their
-- own folder (avatars/<member id>/...). Skipped on plain Postgres (tests),
-- which has no Supabase Storage.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present: skipping avatar bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  execute $p$
    create policy avatars_insert_own on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  $p$;
  execute $p$
    create policy avatars_update_own on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  $p$;
  execute $p$
    create policy avatars_delete_own on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  $p$;
end;
$$;
