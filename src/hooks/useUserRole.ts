import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'free' | 'pro' | 'pro_gift' | 'admin' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async (userId: string) => {
      try {
        const rpcPromise = supabase.rpc('get_user_role', { _user_id: userId });
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('get_user_role timeout')), 8000);
        });
        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('free');
        } else {
          setRole(data || 'free');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRole('free');
      } finally {
        setLoading(false);
      }
    };

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setLoading(true);
        const uid = session.user.id;
        // Defer Supabase calls with setTimeout to avoid deadlocks
        setTimeout(() => {
          fetchUserRole(uid);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    // Initial fetch
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchUserRole(user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isPro = role === 'pro' || role === 'pro_gift' || role === 'admin';
  const isAdmin = role === 'admin';
  const isFree = role === 'free';

  return { role, isPro, isAdmin, isFree, loading };
};
