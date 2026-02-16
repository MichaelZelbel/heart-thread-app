import { useEffect, useState } from 'react';
import { SEOHead } from "@/components/seo/SEOHead";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Please sign in",
            description: "Sign in to access your Pro features",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        // Check subscription status
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Error checking subscription:', error);
        }

        setIsChecking(false);

        // Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (error) {
        console.error('Error:', error);
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [navigate, toast]);

  return (
    <>
    <SEOHead title="Payment Success | Cherishly" noIndex />
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isChecking ? (
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            ) : (
              <CheckCircle className="w-16 h-16 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isChecking ? "Activating Your Pro Account..." : "Welcome to Cherishly Pro! 💖"}
          </CardTitle>
          <CardDescription>
            {isChecking 
              ? "We're setting up your account with all Pro features."
              : "Your payment was successful and you now have access to all Pro features!"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChecking && (
            <>
              <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">What's included:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ AI chats with Claire</li>
                  <li>✓ Email notifications for special dates</li>
                  <li>✓ Full Moments Log access</li>
                  <li>✓ Advanced profile details</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Redirecting to your dashboard in 3 seconds...
              </p>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full"
              >
                Go to Dashboard Now
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default PaymentSuccess;
