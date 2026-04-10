-- Percent-based placement (center of tile as % of room box). Allows overlapping cells; no grid unique conflicts.
ALTER TABLE public.room_decorations
  ADD COLUMN IF NOT EXISTS pos_left_pct double precision,
  ADD COLUMN IF NOT EXISTS pos_top_pct double precision;

UPDATE public.room_decorations
SET
  pos_left_pct = (grid_x::double precision / 11.0) * 100.0,
  pos_top_pct = (grid_y::double precision / 11.0) * 100.0
WHERE pos_left_pct IS NULL OR pos_top_pct IS NULL;

UPDATE public.room_decorations
SET pos_left_pct = 50.0, pos_top_pct = 50.0
WHERE pos_left_pct IS NULL OR pos_top_pct IS NULL;

ALTER TABLE public.room_decorations
  ALTER COLUMN pos_left_pct SET DEFAULT 50,
  ALTER COLUMN pos_top_pct SET DEFAULT 50;

ALTER TABLE public.room_decorations
  ALTER COLUMN pos_left_pct SET NOT NULL,
  ALTER COLUMN pos_top_pct SET NOT NULL;

ALTER TABLE public.room_decorations
  DROP CONSTRAINT IF EXISTS unique_room_placement;

ALTER TABLE public.room_decorations
  ALTER COLUMN grid_x SET DEFAULT 0,
  ALTER COLUMN grid_y SET DEFAULT 0;
