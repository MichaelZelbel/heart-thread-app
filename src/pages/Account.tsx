import { useState, useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft, Mail, Lock, Bell, Globe, Sparkles, CreditCard, Loader2, Shield } from "lucide-react";
import { SyncSettings } from "@/components/settings/SyncSettings";
import { Link } from "react-router-dom";

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
  { value: "UTC", label: "UTC" },
];

export default function Account() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro, isAdmin, role } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Subscription fields
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<{
    subscribed: boolean;
    subscription_end?: string;
  } | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  
  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [emailVerificationPending, setEmailVerificationPending] = useState(false);
  
  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    checkAuth();
    loadProfile();
    if (isPro) {
      loadSubscription();
    }
  }, [isPro]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setEmail(profile.email || user.email || "");
        setTimezone(profile.timezone || getBrowserTimezone());
        setEmailNotifications(profile.email_notifications_enabled || false);
        setEmailVerificationPending(profile.email_verification_pending || false);
      } else {
        // Set defaults
        setEmail(user.email || "");
        setTimezone(getBrowserTimezone());
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load account settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBrowserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const loadSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscriptionData(data);
    } catch (error) {
      console.error("Error loading subscription:", error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setOpeningPortal(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to manage your subscription",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if email changed
      const emailChanged = email !== user.email;

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          email: email,
          timezone: timezone,
          email_notifications_enabled: emailNotifications,
          email_verification_pending: emailChanged,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // If email changed, trigger verification
      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });

        if (emailError) throw emailError;

        setEmailVerificationPending(true);
        toast({
          title: "Verification email sent",
          description: "Please check your new email address to verify the change.",
        });
      } else {
        toast({
          title: "Success",
          description: "Account settings saved",
        });
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save account settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No email found");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
    <SEOHead title="Account Settings | Cherishly" noIndex />
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        <div className="space-y-6">
          {/* Admin Dashboard Link - Only visible to admins */}
          {isAdmin && (
            <Card className="border-red-500/20 bg-gradient-to-br from-red-50/50 to-pink-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Shield className="w-5 h-5" />
                  Admin Access
                </CardTitle>
                <CardDescription>
                  Manage users and system settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/admin")}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Open Admin Dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                />
                {emailVerificationPending && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Verification pending - Please check your email
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Subscription & Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>
                Manage your Cherishly subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPro || isAdmin ? (
                <div className="space-y-4">
                  {subscriptionLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Plan</span>
                          <Badge className="bg-gradient-to-r from-primary to-primary/80">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Cherishly Pro {role === 'pro_gift' && '(Gifted)'}
                          </Badge>
                        </div>
                        
                        {subscriptionData?.subscription_end && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Next Renewal</span>
                            <span className="text-sm font-medium">
                              {new Date(subscriptionData.subscription_end).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge variant="outline" className="text-green-600 border-green-600/50">
                            Active
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {role !== 'pro_gift' ? (
                          <>
                            <Button 
                              onClick={handleManageSubscription}
                              disabled={openingPortal}
                              className="w-full gap-2"
                              variant="outline"
                            >
                              {openingPortal ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Opening Portal...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  Manage Subscription
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                              Update payment method, view invoices, or cancel anytime in the portal.
                            </p>
                          </>
                        ) : (
                          <div className="text-center py-2">
                            <p className="text-sm text-muted-foreground">
                              You have lifetime Pro access as a gift. No subscription management needed.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">You're on the Free plan</p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Upgrade to Cherishly Pro to unlock AI chats, email reminders, Moments, and advanced details.
                    </p>
                  </div>
                  <Button asChild className="gap-2">
                    <Link to="/pricing">
                      <Sparkles className="w-4 h-4" />
                      Upgrade to Pro
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Email Notifications
                {!isPro && <Badge variant="secondary" className="text-xs">Pro</Badge>}
              </CardTitle>
              <CardDescription>
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPro ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="notifications">Event Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        When on, you'll receive an email at 00:00 in your selected timezone on the day of any important event for your Cherished.
                      </p>
                    </div>
                    <Switch
                      id="notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                  <Button onClick={saveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Notification Settings"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Upgrade to Pro to receive email reminders for your cherished ones' special dates.
                  </p>
                  <Button asChild className="gap-2">
                    <Link to="/pricing">
                      <Sparkles className="w-4 h-4" />
                      Upgrade to Pro
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sync with Temerio */}
          <SyncSettings />

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button
                onClick={changePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}
