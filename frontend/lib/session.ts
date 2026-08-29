"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedCareUser } from "@/lib/auth";
import { SESSION_EVENT } from "@/lib/auth";

/**
 * Hook to get and watch the current authenticated user from Supabase
 */
export function useSession(): MedCareUser | null {
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
          name: authUser.email.split("@")[0] || "User",
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
        const currentUser: MedCareUser = {
          name: session.user.email.split("@")[0] || "User",
          email: session.user.email,
        };
        setUser(currentUser);
      } else {
        setUser(null);
      }

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

  return isLoading ? null : user;
}
