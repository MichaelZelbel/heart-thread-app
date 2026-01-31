import { useCallback } from 'react';
import { useAICredits } from '@/hooks/useAICredits';
import { toast } from '@/hooks/use-toast';

export const useAICreditsGate = () => {
  const { credits, isLoading, error, refetch } = useAICredits();

  const hasCredits = isLoading || (credits?.remainingCredits ?? 0) > 0;

  const checkCredits = useCallback((): boolean => {
    // Fail-open while loading - server will catch if no credits
    if (isLoading) {
      return true;
    }

    if (!credits || credits.remainingCredits <= 0) {
      toast({
        title: "No AI Credits",
        description: "Please wait until your AI Credits reset.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [isLoading, credits]);

  return {
    hasCredits,
    isLoading,
    checkCredits,
    credits,
    refetchCredits: refetch,
  };
};
