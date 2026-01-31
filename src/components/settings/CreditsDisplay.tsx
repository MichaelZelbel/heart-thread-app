import { useAICredits } from '@/hooks/useAICredits';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';

export const CreditsDisplay = () => {
  const { credits, isLoading } = useAICredits();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!credits) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Unable to load credit information.
      </div>
    );
  }

  const rolloverCredits = credits.rolloverTokens / credits.tokensPerCredit;
  const displayTotal = credits.planBaseCredits + rolloverCredits;
  const usagePercentage = displayTotal > 0 
    ? (credits.remainingCredits / displayTotal) * 100 
    : 0;
  
  // Calculate rollover section percentage (portion of bar that represents rollover)
  const rolloverPercentage = displayTotal > 0 
    ? (rolloverCredits / displayTotal) * 100 
    : 0;

  // Rollover preview logic
  const periodEnd = credits.periodEnd ? new Date(credits.periodEnd) : null;
  const now = new Date();
  const daysUntilReset = periodEnd ? differenceInDays(periodEnd, now) : null;
  const showRolloverPreview = daysUntilReset !== null && daysUntilReset <= 5 && daysUntilReset >= 0;
  
  // Potential rollover is min of remaining credits and plan base credits
  const potentialRollover = Math.min(credits.remainingCredits, credits.planBaseCredits);

  const getRolloverTimeText = () => {
    if (daysUntilReset === null) return '';
    if (daysUntilReset === 0) return 'today';
    if (daysUntilReset === 1) return 'tomorrow';
    return `in ${daysUntilReset} days`;
  };

  const resetDate = periodEnd ? format(periodEnd, 'MMM d') : 'next period';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">AI Credits remaining</span>
        <span className="text-sm font-semibold text-foreground">
          {Math.floor(credits.remainingCredits)} of {Math.floor(displayTotal)}
        </span>
      </div>

      {/* Progress bar with rollover indicator */}
      <div className="relative">
        <Progress value={usagePercentage} className="h-3" />
        {/* Rollover section indicator - darker portion at the end */}
        {rolloverPercentage > 0 && (
          <div 
            className="absolute top-0 right-0 h-3 bg-primary/30 rounded-r-full pointer-events-none"
            style={{ width: `${rolloverPercentage}%` }}
          />
        )}
      </div>

      {/* Rollover preview banner */}
      {showRolloverPreview && potentialRollover > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-md text-sm">
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{Math.floor(potentialRollover)}</span> credits will carry over to next period ({getRolloverTimeText()})
          </span>
        </div>
      )}

      {/* Info lines */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          <span>Up to {Math.floor(credits.planBaseCredits)} credits rollover</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          <span>{Math.floor(credits.planBaseCredits)} credits reset on {resetDate}</span>
        </div>
      </div>
    </div>
  );
};
