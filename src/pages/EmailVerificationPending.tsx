import { useState, useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, RefreshCw, Heart, Loader2 } from "lucide-react";
import cherishlyLogo from "@/assets/cherishly-logo.png";

const EmailVerificationPending = () => {
  const [email, setEmail] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user email from session or from pending local storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || "");
        
        // If email is already verified, redirect to dashboard after completing pending data
        if (session.user.email_confirmed_at) {
          checkAndCompletePendingCherish(session.user);
        } else {
          setChecking(false);
        }
      } else {
        // No session yet — show pending page using stored email
        const pending = localStorage.getItem("pendingCherishData");
        if (pending) {
          try {
            const data = JSON.parse(pending);
            if (data.email) setEmail(data.email);
          } catch {}
        }
        setChecking(false);
      }
    });

    // Listen for email verification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED" && session?.user.email_confirmed_at) {
        checkAndCompletePendingCherish(session.user);
      }
    });

    // Set up interval to check verification status
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        checkAndCompletePendingCherish(user);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [navigate]);

  const checkAndCompletePendingCherish = async (user: any) => {
    const pendingData = localStorage.getItem("pendingCherishData");
    if (pendingData) {
      await completePendingCherish(user, JSON.parse(pendingData));
    } else {
      toast.success("Email verified! Welcome to Cherishly 💕");
      navigate("/dashboard");
    }
  };

  const completePendingCherish = async (user: any, wizardData: any) => {
    let loadingToast: string | number | undefined;
    try {
      setChecking(true);
      loadingToast = toast.loading("Completing your profile...");
      
      // Clear pending data immediately to prevent duplicate processing
      localStorage.removeItem("pendingCherishData");
      
      // Ensure user profile exists
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from("profiles").insert({
            id: user.id,
            display_name: wizardData.displayName || (user.email?.split('@')[0] ?? "You"),
            email: user.email,
            email_verification_pending: false
          });
        }
      } catch (e) {
        console.error("Profile create/check failed", e);
      }

      // Check if partner already exists with this name to prevent duplicates
      const { data: existingPartner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", wizardData.nickname)
        .maybeSingle();

      if (existingPartner) {
        // Partner already exists, just navigate to dashboard
        if (loadingToast) toast.dismiss(loadingToast);
        setChecking(false);
        toast.success("Welcome back to Cherishly 💕");
        navigate("/dashboard");
        return;
      }

      // Determine birthdate if creating a Birthday event
      let birthdate = null;
      if (wizardData.specialDay?.day && wizardData.specialDay?.month) {
        const eventType = wizardData.specialDay.eventType === "Custom..." 
          ? wizardData.specialDay.customEventType 
          : wizardData.specialDay.eventType;
        
        if (eventType === "Birthday") {
          const eventDate = new Date(
            wizardData.specialDay.year || new Date().getFullYear(),
            wizardData.specialDay.month,
            wizardData.specialDay.day
          );
          birthdate = eventDate.toISOString().split('T')[0];
        }
      }

      // Create partner profile
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .insert({
          user_id: user.id,
          name: wizardData.nickname,
          love_language_physical: wizardData.loveLanguages.physical,
          love_language_words: wizardData.loveLanguages.words,
          love_language_quality: wizardData.loveLanguages.quality,
          love_language_acts: wizardData.loveLanguages.acts,
          love_language_gifts: wizardData.loveLanguages.gifts,
          birthdate: birthdate,
        })
        .select()
        .single();

      if (partnerError) throw partnerError;

      // Create event if provided
      if (wizardData.specialDay?.day && wizardData.specialDay?.month) {
        const eventDate = new Date(
          wizardData.specialDay.year || new Date().getFullYear(),
          wizardData.specialDay.month,
          wizardData.specialDay.day
        );
        
        const eventType = wizardData.specialDay.eventType === "Custom..." 
          ? wizardData.specialDay.customEventType 
          : wizardData.specialDay.eventType;

        await supabase.from("events").insert({
          user_id: user.id,
          partner_id: partner.id,
          event_date: eventDate.toISOString().split('T')[0],
          event_type: eventType || "custom",
          title: eventType || "Special Day",
          is_recurring: true,
        });
      }

      // Add likes and dislikes
      if (wizardData.likes?.length > 0) {
        await supabase.from("partner_likes").insert(
          wizardData.likes.map((like: string, index: number) => ({
            partner_id: partner.id,
            item: like,
            position: index,
          }))
        );
      }

      if (wizardData.dislikes?.length > 0) {
        await supabase.from("partner_dislikes").insert(
          wizardData.dislikes.map((dislike: string, index: number) => ({
            partner_id: partner.id,
            item: dislike,
            position: index,
          }))
        );
      }

      if (loadingToast) toast.dismiss(loadingToast);
      setChecking(false);
      toast.success("Profile complete! Welcome to Cherishly 💕");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error completing profile:", error);
      if (loadingToast) toast.dismiss(loadingToast);
      setChecking(false);
      toast.error("Failed to complete profile. Please try again.");
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleResend = async () => {
    if (!canResend || resending) return;

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      toast.success("Verification email sent! Please check your inbox.");
      setCanResend(false);
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend email");
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
    <SEOHead title="Verify Your Email | Cherishly" noIndex />
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <img src={cherishlyLogo} alt="Cherishly logo" className="w-full h-full" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Check Your Email
          </h1>
        </div>

        <Card className="shadow-soft border-2">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verify Your Email Address</CardTitle>
            <CardDescription className="text-base mt-2">
              We've sent a verification link to:
              <br />
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Heart className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Almost there!</p>
                  <p className="text-muted-foreground">
                    Click the verification link in your email to activate your Cherishly account and access your cherished connections.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Can't find the email?</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes for the email to arrive</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={!canResend || resending}
              >
                {resending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : canResend ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                ) : (
                  <>Resend in {countdown}s</>
                )}
              </Button>

            </div>

            {checking && (
              <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking verification status...
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          Once verified, you'll be automatically redirected to your dashboard.
        </p>
      </div>
    </div>
    </>
  );
};

export default EmailVerificationPending;
