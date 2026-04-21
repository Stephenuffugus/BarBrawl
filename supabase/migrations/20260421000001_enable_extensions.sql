-- Enable extensions required by BarBrawl.
-- PostGIS powers geospatial queries for the bar map (spec §8).

create extension if not exists postgis with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
