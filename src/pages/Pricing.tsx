import { Check, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Pricing = () => {
  const freeFeatures = [
    'Create and save your Cherished people',
    'Add basic details, likes, and dislikes',
    'View your love calendar',
    'Access from any device',
    'See Pro features as teasers'
  ];

  const proFeatures = [
    'All Free features',
    'AI chats with Claire (AI relationship companion)',
    'Email notifications for special dates',
    'Full "Moments Log"',
    'Full access to advanced details',
    'Priority support'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="secondary" className="mb-4">
            <Heart className="w-3 h-3 mr-1" />
            Pricing Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Choose the plan that feels right for your heart 💖
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free, or go Pro to unlock your most meaningful connections.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Free Plan */}
          <Card className="relative border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>Perfect for getting started</CardDescription>
              <div className="mt-4">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-primary shadow-xl hover:shadow-2xl transition-all">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-primary to-primary/80 px-4 py-1">
                <Sparkles className="w-3 h-3 mr-1" />
                Special Offer
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <CardTitle className="text-2xl flex items-center gap-2">
                Pro
                <Heart className="w-5 h-5 text-primary" />
              </CardTitle>
              <CardDescription>Unlock the full experience</CardDescription>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  $4.99
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <div className="text-sm text-muted-foreground line-through">
                Regular price: $9.99/month
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full gap-2" size="lg">
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro 💞
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Footer Message */}
        <div className="text-center">
          <p className="text-muted-foreground italic">
            Cherishly Pro helps you keep love alive — one thoughtful touch at a time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
