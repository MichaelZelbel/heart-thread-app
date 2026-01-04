import { 
  User, 
  Heart, 
  MapPin, 
  Cake, 
  Users,
  ThumbsUp,
  ThumbsDown,
  Shield,
  StickyNote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BirthdatePicker } from "@/components/BirthdatePicker";
import { ItemManager } from "@/components/ItemManager";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";

interface LoveLanguages {
  physical: number;
  words: number;
  quality: number;
  acts: number;
  gifts: number;
}

interface ProfileReferenceProps {
  partnerId: string;
  partnerName: string;
  name: string;
  setName: (name: string) => void;
  relationshipType: string;
  setRelationshipType: (type: string) => void;
  birthdate: Date | null;
  setBirthdate: (date: Date | null) => void;
  genderIdentity: string;
  setGenderIdentity: (gender: string) => void;
  customGender: string;
  setCustomGender: (gender: string) => void;
  country: string;
  setCountry: (country: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  loveLanguages: LoveLanguages;
  setLoveLanguages: (languages: LoveLanguages) => void;
  onSave: (data: any, showToast?: boolean) => void;
  onDebouncedSave: (data: any) => void;
  saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>;
}

const COUNTRIES = [
  { value: "Prefer not to say", label: "Prefer not to say" },
  { value: "United States", label: "United States 🇺🇸" },
  { value: "United Kingdom", label: "United Kingdom 🇬🇧" },
  { value: "Canada", label: "Canada 🇨🇦" },
  { value: "Australia", label: "Australia 🇦🇺" },
  { value: "Germany", label: "Germany 🇩🇪" },
  { value: "France", label: "France 🇫🇷" },
  { value: "Spain", label: "Spain 🇪🇸" },
  { value: "Italy", label: "Italy 🇮🇹" },
  { value: "Netherlands", label: "Netherlands 🇳🇱" },
  { value: "Japan", label: "Japan 🇯🇵" },
  { value: "Other", label: "Other" },
];

export const ProfileReference = ({
  partnerId,
  partnerName,
  name,
  setName,
  relationshipType,
  setRelationshipType,
  birthdate,
  setBirthdate,
  genderIdentity,
  setGenderIdentity,
  customGender,
  setCustomGender,
  country,
  setCountry,
  notes,
  setNotes,
  loveLanguages,
  setLoveLanguages,
  onSave,
  onDebouncedSave,
  saveTimeoutRef,
}: ProfileReferenceProps) => {
  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="text-center pb-4 border-b border-border/30">
        <h2 className="text-lg font-medium text-muted-foreground">Reference Sheet</h2>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Stable information about {partnerName} — update anytime
        </p>
      </div>

      {/* Basic Information - Compact Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="w-4 h-4" />
          Basic Information
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Name / Nickname</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={e => {
                setName(e.target.value);
                onDebouncedSave({ name: e.target.value });
              }}
              onBlur={(e) => {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                onSave({ name: e.target.value }, true);
              }}
              placeholder="What do you call them?"
              className="h-9 text-sm"
              data-testid="what-do-you-call-them"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="relationshipType" className="text-xs">Relationship</Label>
            <Select value={relationshipType} onValueChange={(v) => {
              setRelationshipType(v);
              onSave({ relationshipType: v });
            }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="crush">Crush</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birthdate" className="text-xs flex items-center gap-1">
              <Cake className="w-3 h-3" />
              Birthday
            </Label>
            <BirthdatePicker 
              value={birthdate} 
              onChange={(d) => {
                setBirthdate(d);
                onSave({ birthdate: d });
              }} 
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genderIdentity" className="text-xs">Identity</Label>
            <Select value={genderIdentity} onValueChange={(v) => {
              setGenderIdentity(v);
              if (v !== "Custom ✨") onSave({ genderIdentity: v });
            }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Woman 💐">Woman</SelectItem>
                <SelectItem value="Man 🌹">Man</SelectItem>
                <SelectItem value="Nonbinary 🌈">Nonbinary</SelectItem>
                <SelectItem value="Prefer not to say 🙊">Prefer not to say</SelectItem>
                <SelectItem value="Custom ✨">Custom</SelectItem>
              </SelectContent>
            </Select>
            {genderIdentity === "Custom ✨" && (
              <Input 
                value={customGender}
                onChange={e => {
                  setCustomGender(e.target.value);
                  onDebouncedSave({ genderIdentity: e.target.value });
                }}
                onBlur={() => {
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  onSave({ genderIdentity: customGender }, true);
                }}
                placeholder="Custom identity"
                className="h-9 text-sm mt-1.5"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country" className="text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location
            </Label>
            <Select value={country} onValueChange={(v) => {
              setCountry(v);
              onSave({ country: v });
            }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {COUNTRIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Love Languages - Compact */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Heart className="w-4 h-4" />
          Love Languages
        </div>
        
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="pt-4">
            <LoveLanguageHeartRatings 
              values={loveLanguages} 
              onChange={(v) => {
                setLoveLanguages(v);
                onSave({ loveLanguages: v });
              }} 
            />
          </CardContent>
        </Card>
      </section>

      {/* Likes & Dislikes - Side by Side */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ThumbsUp className="w-4 h-4" />
          Preferences
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <ItemManager 
            partnerId={partnerId} 
            type="likes" 
            title="Likes" 
            subtitle="Things that bring them joy"
            emptyState="Add things they love" 
          />
          <ItemManager 
            partnerId={partnerId} 
            type="dislikes" 
            title="Dislikes" 
            subtitle="Things to be mindful of"
            emptyState="Add things to avoid" 
          />
        </div>
      </section>

      {/* Boundaries & Sensitivities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Shield className="w-4 h-4" />
            Boundaries & Sensitivities
          </div>
          <Badge variant="outline" className="text-[10px]">Important</Badge>
        </div>
        
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="pt-4">
            <Textarea
              placeholder="Topics to approach carefully, triggers to avoid, communication preferences during stress..."
              className="min-h-[80px] resize-none text-sm bg-transparent border-0 p-0 focus-visible:ring-0"
            />
            <p className="text-[11px] text-muted-foreground/60 mt-2">
              This information helps Claire give more thoughtful advice
            </p>
          </CardContent>
        </Card>
      </section>

      {/* General Notes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <StickyNote className="w-4 h-4" />
          General Notes
        </div>
        
        <Card className="border-border/50 bg-muted/20">
          <CardContent className="pt-4">
            <Textarea
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
                onDebouncedSave({ notes: e.target.value });
              }}
              onBlur={(e) => {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                onSave({ notes: e.target.value }, true);
              }}
              placeholder="Anything else worth remembering about them..."
              className="min-h-[100px] resize-none text-sm bg-transparent border-0 p-0 focus-visible:ring-0"
            />
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <div className="text-center pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground/50">
          Changes save automatically
        </p>
      </div>
    </div>
  );
};
