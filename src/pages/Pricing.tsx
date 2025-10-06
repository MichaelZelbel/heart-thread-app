import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPro, loading: roleLoading } = useUserRole();
  const [isLoadingStripe, setIsLoadingStripe] = useState(false);

  const handleStripeCheckout = async () => {
    try {
      setIsLoadingStripe(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to upgrade to Pro",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Having trouble upgrading? Drop us a note — we'll fix it fast 💕",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStripe(false);
    }
  };


  const handleManageSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to manage your subscription",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    }
  };

  const freeFeatures = [
    'Create and save your Cherished people',
    'Add details, likes, and dislikes',
    'View your love calendar',
    'Access from any device'
  ];

  const proFeatures = [
    'All Free features',
    '💬 AI chats with Claire — your gentle relationship companion',
    '💌 Email reminders for birthdays, anniversaries & special dates',
    '📓 Full "Moments Log" to capture your memories',
    '💖 Advanced details for a deeper connection',
    '🎀 Priority support when love tech needs a hand'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20 space-y-6">
          <div className="text-5xl mb-4">💕</div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
            Choose the plan that feels right for your heart 💕
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start free, or go Pro to make cherishing your favorite people effortless and unforgettable.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {/* Free Plan */}
          <Card className="relative border-2 hover:shadow-lg hover:border-primary/30 transition-all p-6" style={{ boxShadow: 'var(--shadow-soft)' }}>
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl font-semibold">Free</CardTitle>
              <CardDescription className="text-base">Perfect for getting started</CardDescription>
              <div className="mt-4 pt-2">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-muted-foreground text-lg">/month</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground italic mt-8 text-center">
                Your love story begins here — simple, sweet, and free.
              </p>
            </CardContent>
            <CardFooter className="pt-4">
              <Button variant="outline" className="w-full" disabled>
                {roleLoading ? "Loading..." : "Free Plan"}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-primary p-6 transition-all hover:shadow-2xl" style={{ boxShadow: '0 8px 30px -4px hsl(340 75% 55% / 0.2)' }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-primary to-primary/80 px-4 py-1.5 rounded-full shadow-md">
                🌸 Special Launch Offer
              </Badge>
            </div>
            <CardHeader className="pt-8 space-y-3">
              <CardTitle className="text-2xl font-semibold">Pro</CardTitle>
              <CardDescription className="text-base">Unlock the full experience</CardDescription>
              <div className="mt-4 pt-2 flex items-baseline gap-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  $4.99
                </span>
                <span className="text-muted-foreground text-lg">/month</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="line-through">Regular price: $9.99/month</span>
                <span className="block mt-1">Cancel anytime</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground italic mt-8 text-center">
                You bring the love — we'll help you remember the magic.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-4">
              {isPro ? (
                <Button 
                  onClick={handleManageSubscription}
                  variant="outline" 
                  className="w-full gap-2" 
                  size="lg"
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button 
                  onClick={handleStripeCheckout}
                  disabled={isLoadingStripe || roleLoading}
                  className="w-full gap-2 hover:scale-105 transition-transform" 
                  size="lg"
                >
                  {isLoadingStripe ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Upgrade to Pro 💞
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Founder Testimonial */}
        <div className="max-w-3xl mx-auto mb-16 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl p-8 border border-primary/10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl border-4 border-primary/20" style={{ boxShadow: '0 0 20px hsl(340 75% 55% / 0.3)' }}>
                💗
              </div>
            </div>
            <div className="flex-1">
              <p className="text-base md:text-lg italic text-foreground/90 mb-2">
                "Cherishly helps me remember the little things — and that's made all the difference."
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                — Michael Zelbel, Founder of Cherishly
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Questions you might have 💭
          </h2>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                Can I cancel anytime?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Absolutely. You can cancel your Pro plan anytime — your account will stay active until the end of your billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                What happens if I forget to renew?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                No worries — all your data stays safe. You'll simply return to the Free plan until you choose to upgrade again.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                Is my information private?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                100%. Your Cherished profiles and notes are private to you — we never share or sell your data.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                Can I try Pro features before paying?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Some Pro features appear as previews. Upgrade whenever you're ready to unlock the full experience.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                Do you offer yearly billing?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Not yet — we're focusing on making Cherishly even better first. 💕
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Footer Message */}
        <div className="text-center">
          <p className="text-muted-foreground italic text-lg">
            Cherishly Pro helps you keep love alive — one thoughtful touch at a time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
