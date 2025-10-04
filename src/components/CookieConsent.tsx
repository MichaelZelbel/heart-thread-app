import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-3">
      <div className="max-w-3xl mx-auto">
        <div 
          className="bg-background/75 backdrop-blur-lg rounded-xl shadow-sm border border-border/30 px-4 py-3"
          style={{
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-foreground/90 text-center sm:text-left flex-1">
              A few cookies, so faces smile and feelings grow just right. 💗
            </p>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="h-8 px-3 text-xs"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="h-8 px-3 text-xs"
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
