import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';

interface AICreditsData {
  id: string | null;
  tokensGranted: number;
  tokensUsed: number;
  remainingTokens: number;
  creditsGranted: number;
  creditsUsed: number;
  remainingCredits: number;
  periodStart: string | null;
  periodEnd: string | null;
  source: string | null;
  rolloverTokens: number;
  baseTokens: number;
  planBaseCredits: number;
  tokensPerCredit: number;
}

interface UseAICreditsResult {
  credits: AICreditsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultCredits: AICreditsData = {
  id: null,
  tokensGranted: 0,
  tokensUsed: 0,
  remainingTokens: 0,
  creditsGranted: 0,
  creditsUsed: 0,
  remainingCredits: 0,
  periodStart: null,
  periodEnd: null,
  source: null,
  rolloverTokens: 0,
  baseTokens: 0,
  planBaseCredits: 0,
  tokensPerCredit: 200,
};

export const useAICredits = (): UseAICreditsResult => {
  const [credits, setCredits] = useState<AICreditsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const warningShownRef = useRef(false);
  const { isPro, loading: roleLoading } = useUserRole();

  const fetchCredits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCredits(null);
        setIsLoading(false);
        return;
      }

      // Ensure allowance period exists
      const { error: ensureError } = await supabase.functions.invoke('ensure-token-allowance');
      if (ensureError) {
        console.error('Error ensuring token allowance:', ensureError);
        // Continue anyway - might already have a period
      }

      // Fetch credit settings
      const { data: settings, error: settingsError } = await supabase
        .from('ai_credit_settings')
        .select('key, value_int');

      if (settingsError) {
        throw new Error(`Failed to fetch credit settings: ${settingsError.message}`);
      }

      const settingsMap: Record<string, number> = {};
      for (const s of settings || []) {
        settingsMap[s.key] = s.value_int;
      }

      const tokensPerCredit = settingsMap['tokens_per_credit'] || 200;
      const creditsFree = settingsMap['credits_free_per_month'] || 0;
      const creditsPremium = settingsMap['credits_premium_per_month'] || 1500;

      // Determine plan base credits based on user role
      const planBaseCredits = isPro ? creditsPremium : creditsFree;

      // Fetch current allowance from view
      const { data: allowance, error: allowanceError } = await supabase
        .from('v_ai_allowance_current')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (allowanceError) {
        throw new Error(`Failed to fetch allowance: ${allowanceError.message}`);
      }

      if (!allowance) {
        // No current period - user has no credits
        setCredits({
          ...defaultCredits,
          planBaseCredits,
          tokensPerCredit,
        });
        setIsLoading(false);
        return;
      }

      // Extract metadata
      const metadata = (allowance.metadata as Record<string, unknown>) || {};
      const rolloverTokens = (metadata.rollover_tokens as number) || 0;
      const baseTokens = (metadata.base_tokens as number) || 0;

      const creditsData: AICreditsData = {
        id: allowance.id,
        tokensGranted: allowance.tokens_granted || 0,
        tokensUsed: allowance.tokens_used || 0,
        remainingTokens: allowance.remaining_tokens || 0,
        creditsGranted: allowance.credits_granted || 0,
        creditsUsed: allowance.credits_used || 0,
        remainingCredits: allowance.remaining_credits || 0,
        periodStart: allowance.period_start,
        periodEnd: allowance.period_end,
        source: allowance.source,
        rolloverTokens,
        baseTokens,
        planBaseCredits,
        tokensPerCredit: allowance.tokens_per_credit || tokensPerCredit,
      };

      setCredits(creditsData);
    } catch (err) {
      console.error('Error fetching AI credits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch AI credits');
    } finally {
      setIsLoading(false);
    }
  }, [isPro]);

  // Show low credit warning
  useEffect(() => {
    if (!credits || warningShownRef.current || isLoading) return;

    const totalCredits = credits.planBaseCredits + (credits.rolloverTokens / credits.tokensPerCredit);
    const warningThreshold = totalCredits * 0.15;

    if (credits.remainingCredits < warningThreshold && credits.remainingCredits > 0) {
      warningShownRef.current = true;
      toast({
        title: "Low AI Credits",
        description: `You have ${Math.floor(credits.remainingCredits)} credits remaining. They will reset at the start of your next billing period.`,
        variant: "destructive",
      });
    }
  }, [credits, isLoading]);

  // Fetch on mount when role is loaded
  useEffect(() => {
    if (!roleLoading) {
      fetchCredits();
    }
  }, [roleLoading, fetchCredits]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Reset warning flag on new sign in
        warningShownRef.current = false;
        fetchCredits();
      } else if (event === 'SIGNED_OUT') {
        setCredits(null);
        warningShownRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  return {
    credits,
    isLoading,
    error,
    refetch: fetchCredits,
  };
};
