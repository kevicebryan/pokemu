"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAppDispatch } from "@/redux/hooks";
import { clearAuthUser, setAuthInitialized, setAuthUser } from "@/redux/slices/authSlice";
import { clearProfile, fetchProfileByUserId } from "@/redux/slices/profileSlice";

export function AuthSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!supabase) {
      dispatch(setAuthInitialized());
      return;
    }
    const supabaseClient = supabase;

    let mounted = true;

    const bootstrapSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      const user = data.session?.user;

      if (!mounted) {
        return;
      }

      if (user?.id && user.email) {
        dispatch(setAuthUser({ id: user.id, email: user.email }));
        dispatch(fetchProfileByUserId(user.id));
      } else {
        dispatch(clearAuthUser());
        dispatch(clearProfile());
      }
    };

    bootstrapSession();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user?.id && user.email) {
        dispatch(setAuthUser({ id: user.id, email: user.email }));
        dispatch(fetchProfileByUserId(user.id));
      } else {
        dispatch(clearAuthUser());
        dispatch(clearProfile());
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return null;
}
