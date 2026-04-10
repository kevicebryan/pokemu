-- Optional: only needed when a user has 144 decorations (every grid cell occupied)
-- and two items must swap without a free temp cell. Client code tries a temp cell first.
CREATE OR REPLACE FUNCTION public.move_room_decoration_resolving_collision(
  p_decoration_id uuid,
  p_to_x int,
  p_to_y int
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_from_x int;
  v_from_y int;
  v_other_id uuid;
  v_max int := 11;
BEGIN
  IF p_to_x < 0 OR p_to_x > v_max OR p_to_y < 0 OR p_to_y > v_max THEN
    RAISE EXCEPTION 'grid out of bounds';
  END IF;

  SELECT user_id, grid_x, grid_y
  INTO v_user, v_from_x, v_from_y
  FROM public.room_decorations
  WHERE id = p_decoration_id
  FOR UPDATE;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'decoration not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_from_x = p_to_x AND v_from_y = p_to_y THEN
    RETURN;
  END IF;

  SELECT id INTO v_other_id
  FROM public.room_decorations
  WHERE user_id = v_user
    AND grid_x = p_to_x
    AND grid_y = p_to_y
    AND id <> p_decoration_id
  LIMIT 1
  FOR UPDATE;

  IF v_other_id IS NULL THEN
    UPDATE public.room_decorations
    SET grid_x = p_to_x, grid_y = p_to_y
    WHERE id = p_decoration_id;
    RETURN;
  END IF;

  UPDATE public.room_decorations AS d
  SET
    grid_x = CASE
      WHEN d.id = p_decoration_id THEN p_to_x
      WHEN d.id = v_other_id THEN v_from_x
    END,
    grid_y = CASE
      WHEN d.id = p_decoration_id THEN p_to_y
      WHEN d.id = v_other_id THEN v_from_y
    END
  WHERE d.id IN (p_decoration_id, v_other_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_room_decoration_resolving_collision(uuid, int, int) TO authenticated;
