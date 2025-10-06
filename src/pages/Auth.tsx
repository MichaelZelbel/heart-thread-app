import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
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
            emailRedirectTo: `${window.location.origin}/dashboard`,
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

              <div className="text-center text-sm">
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
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          Your data is private and secure. Cherishly helps you be the best partner you can be.
        </p>
      </div>
    </div>
  );
};

export default Auth;