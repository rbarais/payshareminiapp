begin;
select plan(5);

-- Simule deux utilisateurs via le claim sub
set local role authenticated;

-- Alice crée un groupe
set local request.jwt.claims = '{"sub":"NQ_ALICE","role":"authenticated"}';
insert into groups (id, name, icon, creator_addr) values
  ('00000000-0000-0000-0000-000000000001','Voyage','car','NQ_ALICE');
insert into members (group_id, address, name) values
  ('00000000-0000-0000-0000-000000000001','NQ_ALICE','Alice');

-- Capture le token d'invitation pendant qu'Alice (membre) peut lire le groupe.
create temp table _invite as
  select invite_token from groups where id = '00000000-0000-0000-0000-000000000001';

select is(count(*)::int, 1, 'Alice voit son groupe')
from (select * from groups) g;

-- Bob ne voit rien
set local request.jwt.claims = '{"sub":"NQ_BOB","role":"authenticated"}';
select is(count(*)::int, 0, 'Bob ne voit pas le groupe d''Alice')
from (select * from groups) g;

-- Bob ne peut pas insérer un paiement au nom d'Alice
select throws_ok($$
  insert into payments (group_id, from_addr, to_addr, amount, currency)
  values ('00000000-0000-0000-0000-000000000001','NQ_ALICE','NQ_BOB',10,'NIM')
$$);

-- Bob rejoint avec le bon token (security definer => lit le groupe en interne)
select lives_ok($$
  select join_group('00000000-0000-0000-0000-000000000001',
    (select invite_token from _invite),
    'Bob')
$$, 'Bob rejoint avec le bon token');

select is(count(*)::int, 1, 'Bob voit maintenant le groupe')
from (select * from groups) g;

select * from finish();
rollback;
