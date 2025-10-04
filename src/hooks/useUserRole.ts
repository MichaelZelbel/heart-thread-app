import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'free' | 'pro' | 'admin' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .order('role', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('free'); // Default to free on error
        } else {
          setRole(data?.role || 'free');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRole('free');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const isPro = role === 'pro' || role === 'admin';
  const isAdmin = role === 'admin';
  const isFree = role === 'free';

  return { role, isPro, isAdmin, isFree, loading };
};
