"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedCareUser } from "@/lib/auth";
import { SESSION_EVENT, displayNameFromEmail } from "@/lib/auth";

/**
 * Hook to get and watch the current authenticated user from Supabase.
 * Returns both the user and a loading flag so consumers can distinguish
 * "still checking auth" from "definitely not authenticated".
 */
export function useSession(): { user: MedCareUser | null; isLoading: boolean } {
  const [user, setUser] = useState<MedCareUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    const getInitialUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.email) {
        setUser({
          name: displayNameFromEmail(authUser.email),
          email: authUser.email,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    getInitialUser();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setUser({
          name: displayNameFromEmail(session.user.email),
          email: session.user.email,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);

      // Dispatch event for cross-tab awareness
      window.dispatchEvent(new Event(SESSION_EVENT));
    });

    // Listen for custom session events (logout, etc)
    const handleSessionEvent = () => {
      getInitialUser();
    };

    window.addEventListener(SESSION_EVENT, handleSessionEvent);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener(SESSION_EVENT, handleSessionEvent);
    };
  }, []);

  return { user, isLoading };
}
