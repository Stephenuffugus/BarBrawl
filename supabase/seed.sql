-- Seed data for local development. Applied on `supabase db reset`.
-- NOT applied to production — real bars come from Google Places (spec §5.11).
--
-- 15 mock bars across 3 cities covering all 7 bar types. Coordinates are
-- real-ish centroids; names are fictional. Use these for map/combat testing.

-- Guard against re-seeding duplicates (google_place_id is unique).
delete from public.bars where google_place_id like 'mock_%';

insert into public.bars
  (google_place_id, name, type, location, address, rating,
   atk_modifier, def_modifier, boss, is_auto_generated)
values
  -- ───── NEW YORK (Manhattan) ─────
  ('mock_ny_1', 'The Rusty Nail', 'dive',
   ST_SetSRID(ST_MakePoint(-73.9930, 40.7260), 4326)::geography,
   '112 Stanton St, New York, NY', 3.2, 1.10, 0.80,
   '{"name":"One-Eyed Pete","icon":"🏴‍☠️","catchphrase":"You dont belong here.","move_set":["chair_throw","headbutt","bar_rush"]}'::jsonb,
   true),

  ('mock_ny_2', "Murphy''s Local", 'pub',
   ST_SetSRID(ST_MakePoint(-73.9950, 40.7400), 4326)::geography,
   '201 W 14th St, New York, NY', 4.2, 1.00, 1.10,
   '{"name":"Old Murphy","icon":"☘️","catchphrase":"Sláinte, then trouble.","move_set":["dart_volley","trad_pint_slam"]}'::jsonb,
   true),

  ('mock_ny_3', 'Fourth & Goal', 'sports',
   ST_SetSRID(ST_MakePoint(-73.9830, 40.7500), 4326)::geography,
   '345 E 55th St, New York, NY', 4.1, 1.00, 1.00,
   '{"name":"Big Mike","icon":"🏈","catchphrase":"Defense wins.","move_set":["pool_ball_throw","wing_slap","tv_flash"]}'::jsonb,
   true),

  ('mock_ny_4', 'The Velvet Sour', 'cocktail',
   ST_SetSRID(ST_MakePoint(-74.0030, 40.7260), 4326)::geography,
   '59 Gansevoort St, New York, NY', 4.6, 1.30, 0.90,
   '{"name":"Madame Absinthe","icon":"🧪","catchphrase":"One sip changes everything.","move_set":["toxic_pour","speakeasy_hex","bitter_mist"]}'::jsonb,
   true),

  ('mock_ny_5', 'Hopscotch Brewing', 'brewery',
   ST_SetSRID(ST_MakePoint(-73.9700, 40.7600), 4326)::geography,
   '410 E 90th St, New York, NY', 4.8, 1.10, 1.20,
   '{"name":"The Brewmaster","icon":"⚗️","catchphrase":"You havent earned your hops.","move_set":["fermenter_burst","mash_tun_slam","hop_dust"]}'::jsonb,
   true),

  -- ───── SAN FRANCISCO ─────
  ('mock_sf_1', 'Mission Blackout', 'dive',
   ST_SetSRID(ST_MakePoint(-122.4200, 37.7600), 4326)::geography,
   '2400 Mission St, San Francisco, CA', 3.5, 1.10, 0.80,
   '{"name":"Two-Fist Tess","icon":"🥊","catchphrase":"This is my corner.","move_set":["barstool_wallop","cheap_shot"]}'::jsonb,
   true),

  ('mock_sf_2', 'Shamrock Shores', 'pub',
   ST_SetSRID(ST_MakePoint(-122.4300, 37.7800), 4326)::geography,
   '500 Geary St, San Francisco, CA', 4.3, 1.00, 1.10,
   '{"name":"Father Finn","icon":"🍺","catchphrase":"Have a quiet pint. Or else.","move_set":["dart_salvo","snug_ambush"]}'::jsonb,
   true),

  ('mock_sf_3', 'Marina Courtside', 'sports',
   ST_SetSRID(ST_MakePoint(-122.4400, 37.8000), 4326)::geography,
   '2200 Chestnut St, San Francisco, CA', 4.0, 1.00, 1.00,
   '{"name":"Coach Vance","icon":"🏀","catchphrase":"Play the clock.","move_set":["full_court_press","rim_rattle"]}'::jsonb,
   true),

  ('mock_sf_4', 'Corkscrew SF', 'wine',
   ST_SetSRID(ST_MakePoint(-122.4100, 37.7700), 4326)::geography,
   '88 Hayes St, San Francisco, CA', 4.7, 1.20, 1.00,
   '{"name":"Sommelier Sebastien","icon":"🎩","catchphrase":"Your palate disappoints.","move_set":["cellar_hex","decanter_curse","tannin_wither"]}'::jsonb,
   true),

  ('mock_sf_5', 'Club Pulse', 'nightclub',
   ST_SetSRID(ST_MakePoint(-122.4080, 37.7830), 4326)::geography,
   '444 Broadway, San Francisco, CA', 4.2, 1.40, 0.90,
   '{"name":"DJ Havoc","icon":"🎧","catchphrase":"Drop the beat and your HP.","move_set":["bass_wave","strobe_stun","crowd_push"]}'::jsonb,
   true),

  -- ───── AUSTIN ─────
  ('mock_atx_1', 'Red River Dive', 'dive',
   ST_SetSRID(ST_MakePoint(-97.7400, 30.2700), 4326)::geography,
   '516 E 6th St, Austin, TX', 3.0, 1.10, 0.80,
   '{"name":"Slim Boone","icon":"🎸","catchphrase":"You aint from around here.","move_set":["pool_cue_swipe","sticky_floor_trip"]}'::jsonb,
   true),

  ('mock_atx_2', "O''Brien''s Tavern", 'pub',
   ST_SetSRID(ST_MakePoint(-97.7500, 30.2800), 4326)::geography,
   '225 W 2nd St, Austin, TX', 4.4, 1.00, 1.10,
   '{"name":"O''Brien","icon":"🍻","catchphrase":"One more for the road.","move_set":["locals_gang_up","last_call"]}'::jsonb,
   true),

  ('mock_atx_3', 'East Side Cellar', 'wine',
   ST_SetSRID(ST_MakePoint(-97.7300, 30.2650), 4326)::geography,
   '1811 E 6th St, Austin, TX', 4.5, 1.20, 1.00,
   '{"name":"Vintner Vale","icon":"🍷","catchphrase":"The cellar remembers.","move_set":["shadow_pour","reserve_curse"]}'::jsonb,
   true),

  ('mock_atx_4', 'Zilker Brewing Co.', 'brewery',
   ST_SetSRID(ST_MakePoint(-97.7700, 30.2600), 4326)::geography,
   '1701 S Lamar Blvd, Austin, TX', 4.6, 1.10, 1.20,
   '{"name":"Kettle Kate","icon":"🍺","catchphrase":"Feel the boil.","move_set":["kiln_blast","wort_splash"]}'::jsonb,
   true),

  ('mock_atx_5', 'Warehouse Beats', 'nightclub',
   ST_SetSRID(ST_MakePoint(-97.7350, 30.2750), 4326)::geography,
   '901 E 5th St, Austin, TX', 4.1, 1.40, 0.90,
   '{"name":"DJ Siren","icon":"🪩","catchphrase":"The drop is inevitable.","move_set":["siren_call","kick_drum_slam"]}'::jsonb,
   true);
