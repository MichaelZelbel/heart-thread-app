import { useCallback } from 'react';
import { useAICredits } from '@/hooks/useAICredits';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';

export const useAICreditsGate = () => {
  const { credits, isLoading: creditsLoading, error, refetch } = useAICredits();
  const { isPro, loading: roleLoading } = useUserRole();

  const isLoading = creditsLoading || roleLoading;
  const hasCredits = isLoading || ((credits?.remainingCredits ?? 0) > 0 && isPro);

  const checkCredits = useCallback((): boolean => {
    // Fail-open while loading - server will catch if no credits
    if (isLoading) {
      return true;
    }

    // Check premium status first
    if (!isPro) {
      toast({
        title: "Premium Required",
        description: "AI features require a Premium subscription.",
        variant: "destructive",
      });
      return false;
    }

    // Then check credits
    if (!credits || credits.remainingCredits <= 0) {
      toast({
        title: "No AI Credits",
        description: "Please wait until your AI Credits reset.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [isLoading, isPro, credits]);

  return {
    hasCredits,
    isLoading,
    isPro,
    checkCredits,
    credits,
    refetchCredits: refetch,
  };
};
