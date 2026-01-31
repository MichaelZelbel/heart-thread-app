import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Save, Coins } from "lucide-react";
import { format } from "date-fns";

interface UserTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

interface AllowanceData {
  id: string;
  tokensGranted: number;
  tokensUsed: number;
  periodStart: string;
  periodEnd: string;
  tokensPerCredit: number;
}

export const UserTokenModal = ({ open, onOpenChange, userId, userName }: UserTokenModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowance, setAllowance] = useState<AllowanceData | null>(null);
  const [tokensGranted, setTokensGranted] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [tokensPerCredit, setTokensPerCredit] = useState(200);

  useEffect(() => {
    if (open && userId) {
      fetchAllowance();
    }
  }, [open, userId]);

  const fetchAllowance = async () => {
    setLoading(true);
    try {
      // Call ensure-token-allowance for the target user (admin-only operation)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('ensure-token-allowance', {
        body: { user_id: userId }
      });

      if (error) throw error;

      // Fetch tokens_per_credit from settings
      const { data: settings } = await supabase
        .from('ai_credit_settings')
        .select('value_int')
        .eq('key', 'tokens_per_credit')
        .single();

      const tpc = settings?.value_int || 200;
      setTokensPerCredit(tpc);

      if (data?.period) {
        setAllowance({
          id: data.period.id,
          tokensGranted: data.period.tokens_granted || 0,
          tokensUsed: data.period.tokens_used || 0,
          periodStart: data.period.period_start,
          periodEnd: data.period.period_end,
          tokensPerCredit: tpc,
        });
        setTokensGranted(data.period.tokens_granted || 0);
        setTokensUsed(data.period.tokens_used || 0);
      }
    } catch (error) {
      console.error('Error fetching allowance:', error);
      toast.error("Failed to load user's token allowance");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!allowance) return;
    
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const previousGranted = allowance.tokensGranted;
      const previousUsed = allowance.tokensUsed;

      // Update ai_allowance_periods
      const { error: updateError } = await supabase
        .from('ai_allowance_periods')
        .update({
          tokens_granted: tokensGranted,
          tokens_used: tokensUsed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', allowance.id);

      if (updateError) throw updateError;

      // Log to llm_usage_events
      const idempotencyKey = `admin_adjustment_${allowance.id}_${Date.now()}`;
      const { error: logError } = await supabase
        .from('llm_usage_events')
        .insert({
          user_id: userId,
          idempotency_key: idempotencyKey,
          feature: 'admin_balance_adjustment',
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          credits_charged: 0,
          metadata: {
            admin_id: session.user.id,
            target_user_id: userId,
            target_user_name: userName,
            previous_tokens_granted: previousGranted,
            previous_tokens_used: previousUsed,
            new_tokens_granted: tokensGranted,
            new_tokens_used: tokensUsed,
            granted_delta: tokensGranted - previousGranted,
            used_delta: tokensUsed - previousUsed,
            adjusted_at: new Date().toISOString(),
          },
        });

      if (logError) {
        console.error('Error logging adjustment:', logError);
        // Don't fail the whole operation, just log
      }

      toast.success(`Updated token allowance for ${userName}`);
      
      // Update local state
      setAllowance({
        ...allowance,
        tokensGranted,
        tokensUsed,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving allowance:', error);
      toast.error("Failed to update token allowance");
    } finally {
      setSaving(false);
    }
  };

  const remainingTokens = tokensGranted - tokensUsed;
  const creditsGranted = Math.floor(tokensGranted / tokensPerCredit);
  const creditsUsed = Math.floor(tokensUsed / tokensPerCredit);
  const creditsRemaining = Math.floor(remainingTokens / tokensPerCredit);

  const hasChanges = allowance && (
    tokensGranted !== allowance.tokensGranted || 
    tokensUsed !== allowance.tokensUsed
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Token Allowance
          </DialogTitle>
          <DialogDescription>
            Manage AI token balance for <span className="font-medium">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !allowance ? (
          <div className="py-8 text-center text-muted-foreground">
            No allowance period found for this user.
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Period Info */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Period Start</Label>
                <p className="text-sm font-medium">
                  {format(new Date(allowance.periodStart), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Period End</Label>
                <p className="text-sm font-medium">
                  {format(new Date(allowance.periodEnd), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokensGranted">Tokens Granted</Label>
                <Input
                  id="tokensGranted"
                  type="number"
                  value={tokensGranted}
                  onChange={(e) => setTokensGranted(parseInt(e.target.value) || 0)}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  = {creditsGranted.toLocaleString()} credits
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokensUsed">Tokens Used</Label>
                <Input
                  id="tokensUsed"
                  type="number"
                  value={tokensUsed}
                  onChange={(e) => setTokensUsed(parseInt(e.target.value) || 0)}
                  min={0}
                  max={tokensGranted}
                />
                <p className="text-xs text-muted-foreground">
                  = {creditsUsed.toLocaleString()} credits
                </p>
              </div>
            </div>

            {/* Calculated Values */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Remaining Tokens</Label>
                  <p className={`text-lg font-bold ${remainingTokens < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {remainingTokens.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Remaining Credits</Label>
                  <p className={`text-lg font-bold ${creditsRemaining < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {creditsRemaining.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges || !allowance}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
