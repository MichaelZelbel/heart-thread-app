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
      <main className="relative flex-1 flex items-center justify-center pt-16 min-h-[85vh] overflow-hidden bg-gradient-to-br from-[#FFD9E8] via-[#FFF0F5] to-[#FFF8F5]">
        {/* Floating Hearts Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <Heart
              key={i}
              className="absolute text-primary/20 animate-float-heart"
              style={{
                left: `${(i * 15) % 100}%`,
                top: `${100 + (i * 10)}%`,
                width: `${16 + (i % 3) * 12}px`,
                height: `${16 + (i % 3) * 12}px`,
                animationDelay: `${i * 3}s`,
                animationDuration: `${20 + (i % 2) * 10}s`,
              }}
              fill="currentColor"
            />
          ))}
        </div>

        {/* Content Container */}
        <div className="relative z-10 container mx-auto px-4 py-20 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content Card */}
            <div className="animate-fade-in">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/50">
                <div className="space-y-6">
                  {/* Headline */}
                  <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
                    Love deserves a little memory magic 💖
                  </h1>

                  {/* Subheadline */}
                  <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                    Start cherishing someone special — before the moment fades.
                  </p>

                  {/* CTA Button */}
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={() => setShowWizard(true)}
                      size="lg"
                      className="h-14 px-8 text-lg shadow-glow hover:shadow-xl transition-all duration-300 hover-scale w-full sm:w-auto"
                    >
                      Cherish a Lovely Person 💕
                    </Button>

                    {/* Tagline */}
                    <p className="text-sm text-gray-600 italic">
                      It takes just a minute to make someone unforgettable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Illustration */}
            <div className="relative animate-fade-in animation-delay-200 hidden lg:block">
              <div className="relative">
                <img
                  src={heroImage}
                  alt="Couple holding hands surrounded by hearts and flowers"
                  className="w-full max-w-[600px] mx-auto rounded-3xl shadow-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-3xl pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
