-- Volunteer impact levels (Supporter → Legend)
-- Levels are based on drives/events completed ONLY.
-- Run after schema.sql

insert into public.volunteer_levels (id, name, rank_order, min_events_attended, max_events_attended, color, bg_color, description) values
  ('supporter', 'Supporter', 1, 0, 3, '#6B6B6B', '#F0EDE6', '0–3 drives completed. Every town hero starts here.'),
  ('contributor', 'Contributor', 2, 4, 10, '#2E86AB', '#E5F2F8', '4–10 drives completed. You''re showing up for Hazaribagh.'),
  ('guardian', 'Guardian', 3, 11, 20, '#2D4F4F', '#E8EFEF', '11–20 drives completed. A steady force for the town.'),
  ('champion', 'Champion', 4, 21, 30, '#B8860B', '#FDF6E3', '21–30 drives completed. Leading by example.'),
  ('elite', 'Elite', 5, 31, 40, '#7B4397', '#F3E8F8', '31–40 drives completed. One of the most active changemakers.'),
  ('legend', 'Legend', 6, 41, null, '#C0392B', '#FCEAE8', '41+ drives completed. Hazaribagh legend.')
on conflict (id) do update set
  name = excluded.name,
  rank_order = excluded.rank_order,
  min_events_attended = excluded.min_events_attended,
  max_events_attended = excluded.max_events_attended,
  color = excluded.color,
  bg_color = excluded.bg_color,
  description = excluded.description;

-- Badges: run supabase/badges.sql in the SQL Editor (or paste below).
-- Kept separate so existing projects can upgrade without re-seeding levels.
