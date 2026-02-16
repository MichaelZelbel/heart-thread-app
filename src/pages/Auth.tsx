import { useState, useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import cherishlyLogo from "@/assets/cherishly-logo.png";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validateEmail, passwordSchema, isTestUser } from "@/lib/auth-validation";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth state changes (critical for OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);
  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || "Invalid email");
      isValid = false;
    }

    // Validate password for signup
    if (!isLogin) {
      try {
        passwordSchema.parse(password);
      } catch (error: any) {
        setPasswordError(error.errors[0]?.message || "Invalid password");
        isValid = false;
      }
    }

    return isValid;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;

        // Check if email is verified (unless test user)
        if (!data.user?.email_confirmed_at && !isTestUser(email)) {
          toast.info("Please verify your email before accessing the dashboard");
          navigate("/email-verification-pending");
          return;
        }

        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/email-verification-pending`,
            data: {
              display_name: displayName,
            },
          },
        });
        
        if (error) throw error;

        // For test users, redirect directly to dashboard
        if (isTestUser(email)) {
          toast.success("Account created! Welcome to Cherishly!");
          navigate("/dashboard");
        } else {
          toast.success("Account created! Please verify your email to continue.");
          navigate("/email-verification-pending");
        }
      }
    } catch (error: any) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  return (
    <>
    <SEOHead title="Sign In | Cherishly" description="Sign in or create your Cherishly account." noIndex />
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <img src={cherishlyLogo} alt="Cherishly logo" className="w-16 h-16" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            CHERISHLY
          </h1>
          <p className="text-muted-foreground">Your relationship companion</p>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>{isLogin ? "Welcome Back" : "Let's make love a little more memorable 💕"}</CardTitle>
            <CardDescription>
              {isLogin 
                ? "Sign in to access your relationship hub" 
                : "Create your Cherishly account — we'll keep it safe for you."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Your Name</Label>
                  <Input 
                    id="displayName" 
                    type="text" 
                    placeholder="How should we greet you?" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    required={!isLogin} 
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email} 
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  required 
                  data-testid="auth-email-input"
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    required 
                    minLength={isLogin ? 1 : 8}
                    data-testid="auth-password-input"
                    className={passwordError ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-destructive">{passwordError}</p>
                )}
                {!isLogin && <PasswordStrengthIndicator password={password} />}
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    Use 8+ characters with a mix of letters, numbers, and symbols.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="auth-submit-button">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>{isLogin ? "Sign In" : "Create Account"}</>
                )}
              </Button>
            </form>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>

            <Button 
              type="button"
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>

            <div className="text-center text-sm mt-4">
              <button 
                type="button" 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmailError("");
                  setPasswordError("");
                }}
                className="text-primary hover:underline"
              >
                {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          Your data is private and secure. Cherishly helps you be the best partner you can be.
        </p>
      </div>
    </div>
    </>
  );
};

export default Auth;