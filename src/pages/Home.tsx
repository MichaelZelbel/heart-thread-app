import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { CherishWizard } from "@/components/CherishWizard";
import heroImage from "@/assets/cherishly-hero.jpg";

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
      <main className="relative flex-1 flex items-center justify-center pt-16 min-h-[85vh]">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        
        {/* Frosted Blur Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/90 backdrop-blur-[2px]" />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight drop-shadow-lg">
              Love deserves a little memory magic 💖
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-foreground/90 max-w-2xl mx-auto font-medium drop-shadow-md">
              Start cherishing someone special — before the moment fades.
            </p>

            {/* CTA Button */}
            <div className="space-y-4 pt-4">
              <Button
                onClick={() => setShowWizard(true)}
                size="lg"
                className="h-16 px-8 text-xl shadow-glow hover:shadow-xl transition-all duration-300 hover-scale"
              >
                Cherish a Lovely Person 💕
              </Button>

              {/* Tagline */}
              <p className="text-sm text-foreground/70 italic drop-shadow">
                It takes just a minute to make someone unforgettable.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
