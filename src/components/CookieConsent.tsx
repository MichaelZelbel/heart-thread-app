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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div 
          className="bg-background/85 backdrop-blur-md rounded-2xl shadow-lg border border-border/50 p-4 sm:p-6"
          style={{
            backdropFilter: 'blur(6px)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <p className="text-sm sm:text-base text-foreground text-center sm:text-left flex-1">
              A few cookies, so faces smile and feelings grow just right. 💗
            </p>
            <div className="flex gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="min-w-[80px]"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="min-w-[80px]"
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
