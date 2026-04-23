-- Expand characters.class_id to include the 7th class, Gambler.
-- Context: DESIGN_V1.md added Gambler post-spec. The original constraint
-- in 20260421000002_core_tables.sql only permitted the spec's 6 classes.
--
-- Idempotent: drops by name if present, then re-creates with the new list.

alter table public.characters
  drop constraint if exists characters_class_id_check;

alter table public.characters
  add constraint characters_class_id_check
  check (class_id in (
    'steady',
    'brewer',
    'vintner',
    'shaker',
    'orchardist',
    'drifter',
    'gambler'
  ));
