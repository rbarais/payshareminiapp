create or replace function join_group(p_group_id uuid, p_token text, p_name text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  select * into g from groups where id = p_group_id;
  if g.id is null or g.invite_token <> p_token then
    raise exception 'invalid invite';
  end if;
  insert into members (group_id, address, name)
  values (p_group_id, current_addr(), p_name)
  on conflict (group_id, address) do nothing;
  return jsonb_build_object('name', g.name, 'icon', g.icon);
end $$;

revoke all on function join_group(uuid, text, text) from public;
grant execute on function join_group(uuid, text, text) to authenticated;
