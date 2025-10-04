import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles } from "lucide-react";
import { CherishWizard } from "@/components/CherishWizard";

const Home = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (showWizard) {
    return <CherishWizard onClose={() => setShowWizard(false)} isLoggedIn={isLoggedIn} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Cherishly
            </span>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="hover:bg-primary/10"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center bg-gradient-soft pt-16">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary shadow-glow animate-pulse-soft">
              <Heart className="w-10 h-10 text-white" />
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
              Because love deserves to be remembered.
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Start cherishing someone special in just a few steps.
            </p>

            {/* CTA Button */}
            <div className="space-y-4">
              <Button
                onClick={() => setShowWizard(true)}
                size="lg"
                className="h-16 px-8 text-xl shadow-glow hover:shadow-xl transition-all duration-300 hover-scale"
              >
                <Sparkles className="w-6 h-6 mr-3" />
                Cherish a Lovely Person 💖
              </Button>

              {/* Tagline */}
              <p className="text-sm text-muted-foreground italic">
                It only takes a minute to make someone feel unforgettable.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
