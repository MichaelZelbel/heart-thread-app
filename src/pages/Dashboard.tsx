import { useEffect, useState } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Plus, Calendar, Sparkles, LogOut, User, Settings, GripVertical, Edit2, Archive, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { isTestUser } from "@/lib/auth-validation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { MomentManager } from "@/components/MomentManager";
import { ClaireChat } from "@/components/ClaireChat";
import { ActivitySuggestion } from "@/components/ActivitySuggestion";
import { dateToYMDLocal, parseYMDToLocalDate, cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import cherishlyLogo from "@/assets/cherishly-logo.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  display_name: string;
}
interface Partner {
  id: string;
  name: string;
  photo_url: string | null;
  display_order: number;
}

interface UpcomingMoment {
  id: string;
  title: string;
  moment_date: string;
  is_celebrated_annually: boolean;
  partner_ids: string[] | null;
}

interface UpcomingOccurrence extends UpcomingMoment {
  originalDate: string;
  displayDate: string;
  partnerName?: string;
}

interface MomentSummary {
  id: string;
  title: string | null;
  moment_date: string;
  partner_ids: string[];
}

interface SortablePartnerProps {
  partner: Partner;
  onClick: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function SortablePartner({ partner, onClick, onEdit, onArchive, onDelete }: SortablePartnerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: partner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <div
        className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shrink-0">
          {partner.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{partner.name}</p>
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="h-9 w-9 shrink-0" aria-label="Edit partner"><Edit2 className="w-4 h-4" /></Button>
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onArchive(); }} className="h-9 w-9 shrink-0" aria-label="Archive partner"><Archive className="w-4 h-4" /></Button>
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-9 w-9 shrink-0 text-destructive hover:text-destructive" aria-label="Delete partner"><Trash2 className="w-4 h-4" /></Button>
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isPro, loading: roleLoading } = useUserRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingOccurrence[]>([]);
  const [moments, setMoments] = useState<MomentSummary[]>([]);
  const [totalMoments, setTotalMoments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMomentsDialog, setShowMomentsDialog] = useState(false);
  const [clairePrefillMessage, setClairePrefillMessage] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    const withTimeout = <T,>(promise: Promise<T>, ms = 12000) =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
      ]);

    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const error_description = url.searchParams.get('error_description');

      if (error_description) toast.error(decodeURIComponent(error_description));

      if (code) {
        try {
          await withTimeout(supabase.auth.exchangeCodeForSession(code));
          url.searchParams.delete('code');
          url.searchParams.delete('state');
          url.searchParams.delete('error');
          url.searchParams.delete('error_description');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? `?${url.searchParams.toString()}` : ""));
        } catch (e: any) {
          toast.error(e?.message || 'Failed to complete sign-in');
        }
      }

      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 10000) as any;

      if (!session) { setLoading(false); navigate("/auth"); return; }

      try {
        const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
        if (!expiresAtMs || (expiresAtMs - Date.now()) < 60_000) {
          await withTimeout(supabase.auth.refreshSession(), 8000);
        }
      } catch (e) {
        console.warn('Token refresh failed, forcing re-auth:', e);
        await supabase.auth.signOut();
        setLoading(false);
        toast.error('Session expired. Please sign in again.');
        navigate('/auth');
        return;
      }

      if (!session.user.email_confirmed_at && !isTestUser(session.user.email || "")) {
        setLoading(false);
        navigate("/email-verification-pending");
        return;
      }

      const uid = session.user.id;
      const results = await Promise.allSettled([
        withTimeout(loadProfile(uid), 8000),
        withTimeout(loadPartners(uid), 8000),
        withTimeout(loadUpcomingEvents(uid), 8000),
        withTimeout(loadMoments(uid), 8000),
      ]);

      const failed = results.some(r => r.status === 'rejected');
      if (failed) {
        console.warn('Some dashboard data failed to load');
        toast('Some data took too long to load', { description: 'You can keep using the app—try refreshing if something looks off.' });
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Auth check failed:', error);
      await supabase.auth.signOut();
      setLoading(false);
      toast.error('Session expired. Please sign in again.');
      navigate("/auth");
    }
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
    if (data) setProfile(data);
  };

  const loadPartners = async (userId: string) => {
    const { data } = await supabase.from("partners").select("id, name, photo_url, display_order").eq("user_id", userId).eq("archived", false).neq("relationship_type", "self").order("display_order", { ascending: true });
    if (data) setPartners(data);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = partners.findIndex((p) => p.id === active.id);
    const newIndex = partners.findIndex((p) => p.id === over.id);
    const reorderedPartners = arrayMove(partners, oldIndex, newIndex);
    setPartners(reorderedPartners);
    const updates = reorderedPartners.map((partner, index) =>
      supabase.from("partners").update({ display_order: index }).eq("id", partner.id)
    );
    await Promise.all(updates);
  };

  const handleEditPartner = (partnerId: string) => navigate(`/partner/${partnerId}`);

  const handleArchivePartner = async (partnerId: string, partnerName: string) => {
    const { error } = await supabase.from("partners").update({ archived: true }).eq("id", partnerId);
    if (error) { toast.error("Failed to archive partner"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) loadPartners(session.user.id);
    toast.success(`${partnerName} archived`);
  };

  const handleDeletePartner = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Are you sure you want to delete ${partnerName}? This action cannot be undone.`)) return;
    const { error } = await supabase.from("partners").delete().eq("id", partnerId);
    if (error) { toast.error("Failed to delete partner"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) loadPartners(session.user.id);
    toast.success(`${partnerName} deleted`);
  };

  const loadMoments = async (userId: string) => {
    const { data, count } = await supabase
      .from("moments")
      .select("id, title, moment_date, partner_ids", { count: 'exact' })
      .eq("user_id", userId)
      .order("moment_date", { ascending: false })
      .limit(3);
    if (data) {
      setMoments(data);
      setTotalMoments(count || 0);
    }
  };

  const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const loadUpcomingEvents = async (userId: string) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfWindow = new Date(startOfToday);
    endOfWindow.setDate(endOfWindow.getDate() + 7);
    endOfWindow.setHours(23, 59, 59, 999);

    // Get celebrated-annually moments and partner birthdates
    const { data: celebratedMoments } = await supabase
      .from("moments")
      .select("id, title, moment_date, is_celebrated_annually, partner_ids")
      .eq("user_id", userId)
      .eq("is_celebrated_annually", true);

    const { data: partnersData } = await supabase
      .from("partners")
      .select("id, name, birthdate")
      .eq("user_id", userId)
      .eq("archived", false)
      .neq("relationship_type", "self");

    if (!celebratedMoments && !partnersData) return;

    const partnerMap = new Map(partnersData?.map(p => [p.id, p.name]) || []);
    const occurrences: UpcomingOccurrence[] = [];

    // Process celebrated-annually moments
    celebratedMoments?.forEach(moment => {
      const momentDate = parseYMDToLocalDate(moment.moment_date);
      const currentYear = startOfToday.getFullYear();
      for (let year = currentYear; year <= currentYear + 1; year++) {
        const month = momentDate.getMonth();
        const day = momentDate.getDate();
        let occurrenceDate = new Date(year, month, day);
        if (month === 1 && day === 29 && !isLeapYear(year)) {
          occurrenceDate = new Date(year, 1, 28);
        }
        if (occurrenceDate >= startOfToday && occurrenceDate <= endOfWindow) {
          const partnerId = moment.partner_ids?.[0];
          occurrences.push({
            ...moment,
            originalDate: moment.moment_date,
            displayDate: dateToYMDLocal(occurrenceDate),
            partnerName: partnerId ? partnerMap.get(partnerId) : undefined
          });
        }
      }
    });

    // Process birthdays from partners
    partnersData?.forEach(partner => {
      if (!partner.birthdate) return;
      const birthdate = parseYMDToLocalDate(partner.birthdate);
      const currentYear = startOfToday.getFullYear();
      for (let year = currentYear; year <= currentYear + 1; year++) {
        const month = birthdate.getMonth();
        const day = birthdate.getDate();
        let occurrenceDate = new Date(year, month, day);
        if (month === 1 && day === 29 && !isLeapYear(year)) {
          occurrenceDate = new Date(year, 1, 28);
        }
        if (occurrenceDate >= startOfToday && occurrenceDate <= endOfWindow) {
          occurrences.push({
            id: `birthday-${partner.id}-${year}`,
            title: `${partner.name}'s Birthday`,
            moment_date: partner.birthdate,
            is_celebrated_annually: true,
            partner_ids: [partner.id],
            originalDate: partner.birthdate,
            displayDate: dateToYMDLocal(occurrenceDate),
            partnerName: partner.name
          });
        }
      }
    });

    occurrences.sort((a, b) => a.displayDate.localeCompare(b.displayDate));
    setUpcomingEvents(occurrences);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
      <div className="text-center">
        <Heart className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse-soft" />
        <p className="text-muted-foreground">Loading your love hub...</p>
      </div>
    </div>;
  }

  return <><SEOHead title="Dashboard | Cherishly" noIndex />
    <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={cherishlyLogo} alt="Cherishly logo" className="w-10 h-10" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">CHERISHLY</span>
          </div>
          <div className="flex items-center gap-2">
            {!isPro && !roleLoading && (
              <Button size="sm" onClick={() => navigate("/pricing")} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white flex items-center gap-2">
                <span>Unlock the full magic</span><span>🤍</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/account/profile")}><User className="w-4 h-4 mr-2" />Profile</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/account")}><Settings className="w-4 h-4 mr-2" />Account</Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Logout</Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {profile?.display_name || "Friend"}! 💕</h1>
          <p className="text-muted-foreground">Here's what's happening in your relationship world</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="shadow-soft hover:shadow-glow transition-shadow animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2"><Heart className="w-5 h-5 text-primary" /><span>Cherished</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">{partners.length}</div>
              <p className="text-sm text-muted-foreground mb-4">Beautiful connections</p>
              <div className="text-4xl font-bold text-secondary mb-2">{upcomingEvents.length}</div>
              <p className="text-sm text-muted-foreground">Important dates</p>
            </CardContent>
          </Card>

          <div className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
            <ActivitySuggestion partnerId={partners[0]?.id} onOpenClaire={(message) => setClairePrefillMessage(message)} hasPartners={partners.length > 0} onAddPartner={() => navigate("/partner/new")} isPro={isPro} />
          </div>

          <Card className={cn("shadow-soft hover:shadow-glow transition-shadow animate-scale-in cursor-pointer", !isPro && "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20")} style={{ animationDelay: "0.2s" }} onClick={() => isPro && setShowMomentsDialog(true)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-accent" /><span>Moments</span>
                  {!isPro && <Badge variant="secondary" className="text-xs">Pro</Badge>}
                </div>
                {isPro && (
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setShowMomentsDialog(true); }}><Plus className="w-4 h-4" /></Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPro ? (
                <>
                  <div className="text-4xl font-bold text-accent mb-2">{totalMoments}</div>
                  <p className="text-sm text-muted-foreground mb-3">Memories logged</p>
                  {moments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {moments.map((moment) => {
                        const partnerNames = moment.partner_ids
                          .map((id) => partners.find((p) => p.id === id)?.name)
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <div key={moment.id} className="text-xs">
                            <p className="font-medium truncate">{moment.title || "Untitled"}</p>
                            <p className="text-muted-foreground">{format(new Date(moment.moment_date), "MMM d")}{partnerNames && ` • ${partnerNames}`}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-4">Capture and cherish your favorite memories together.</p>
                  <Button asChild size="lg" className="w-full gap-2"><Link to="/pricing"><Sparkles className="w-4 h-4" />Upgrade to Pro</Link></Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="shadow-soft animate-fade-in">
              <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-4">
                <div><CardTitle>Your Cherished</CardTitle><CardDescription>People who make your heart full</CardDescription></div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => navigate("/partner/new")} size="sm" data-testid="add-partner-button"><Plus className="w-4 h-4 mr-2" />Add Cherished</Button>
                  <Button onClick={() => navigate("/archive")} size="sm" variant="outline">Archive</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                {partners.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No cherished added yet. Start building your connection map!</p>
                    <Button onClick={() => navigate("/partner/new")} variant="outline">Add Your First Cherished</Button>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={partners.map(p => p.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {partners.map((partner) => (
                          <SortablePartner key={partner.id} partner={partner} onClick={() => navigate(`/partner/${partner.id}`)} onEdit={() => handleEditPartner(partner.id)} onArchive={() => handleArchivePartner(partner.id, partner.name)} onDelete={() => handleDeletePartner(partner.id, partner.name)} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-soft animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2"><Calendar className="w-5 h-5 text-secondary" /><span>This Week's Highlights</span></CardTitle>
                <CardDescription>Important dates coming up</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No upcoming events this week</p>
                  </div>
                ) : (
                  <div className="space-y-3" data-testid="upcoming-list">
                    {upcomingEvents.map((event, index) => (
                      <div key={`${event.id}-${event.displayDate}-${index}`} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted transition-colors">
                        <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">
                            {event.title}
                            {event.is_celebrated_annually && <Badge variant="secondary" className="ml-2 text-xs">Yearly</Badge>}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(parseYMDToLocalDate(event.displayDate), "EEEE, MMMM d")}
                            {event.partnerName && ` • ${event.partnerName}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {isPro ? (
              <div className="h-[800px] animate-fade-in">
                <ClaireChat compact={isMobile} prefillMessage={clairePrefillMessage} partnerId={partners[0]?.id} />
              </div>
            ) : (
              <Card className="shadow-soft animate-fade-in">
                <UpgradePrompt featureName="AI Chat with Claire" description="Get personalized relationship advice and gift ideas from your AI companion, Claire." />
              </Card>
            )}
          </div>
        </div>
      </main>

      {isPro && (
        <Dialog open={showMomentsDialog} onOpenChange={setShowMomentsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>All Moments</DialogTitle></DialogHeader>
            <MomentManager showPartnerColumn onMomentChange={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) await loadMoments(session.user.id);
            }} />
          </DialogContent>
        </Dialog>
      )}
    </div></>;
};
export default Dashboard;
