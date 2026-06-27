-- Membres "placeholder" : adresse Nimiq devient optionnelle.
-- Le créateur peut pré-ajouter des membres par nom avant qu'ils rejoignent.
-- Quand ils rejoignent, ils réclament leur placeholder → leur adresse est liée.

-- 1. Rend address nullable
ALTER TABLE members ALTER COLUMN address DROP NOT NULL;

-- 2. La contrainte unique (group_id, address) ne doit pas bloquer les NULL multiples.
--    On la remplace par un index partiel qui exclut les NULL.
ALTER TABLE members DROP CONSTRAINT members_group_id_address_key;
CREATE UNIQUE INDEX members_group_id_address_unique
  ON members (group_id, address)
  WHERE address IS NOT NULL;

-- 3. Empêche qu'une même adresse réclame deux placeholders dans le même groupe.
--    (Couvert par l'index ci-dessus — un UPDATE sur address NULL → non-NULL
--     échoue si (group_id, address) existe déjà dans l'index.)
