import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, RefreshCw } from "lucide-react";
import cherishlyLogo from "@/assets/cherishly-logo.png";

const EmailVerificationPending = () => {
  const [email, setEmail] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user email from session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setEmail(session.user.email || "");
        
        // If email is already verified, redirect to dashboard
        if (session.user.email_confirmed_at) {
          navigate("/dashboard");
        }
      } else {
        // No session, redirect to auth
        navigate("/auth");
      }
    });

    // Listen for email verification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED" && session?.user.email_confirmed_at) {
        toast.success("Email verified! Welcome to Cherishly 💕");
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <img src={cherishlyLogo} alt="Cherishly logo" className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            CHERISHLY
          </h1>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to:
              <br />
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Please check your inbox (and spam folder) for the verification link.</p>
              <p>The link will expire in 24 hours.</p>
            </div>

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

            <Button variant="ghost" className="w-full" onClick={handleLogout}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          Having trouble? Contact us at support@cherishly.ai
        </p>
      </div>
    </div>
  );
};

export default EmailVerificationPending;
