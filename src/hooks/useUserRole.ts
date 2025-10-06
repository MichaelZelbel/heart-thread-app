import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'free' | 'pro' | 'pro_gift' | 'admin' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async (userId: string) => {
      try {
        const { data, error } = await supabase.rpc('get_user_role', {
          _user_id: userId
        });

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setLoading(true);
          await fetchUserRole(session.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

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
