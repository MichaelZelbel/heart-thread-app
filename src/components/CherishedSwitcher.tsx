import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Heart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Partner {
  id: string;
  name: string;
}

interface CherishedSwitcherProps {
  currentPartnerId: string;
  currentPartnerName: string;
}

export const CherishedSwitcher = ({ currentPartnerId, currentPartnerName }: CherishedSwitcherProps) => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("partners")
      .select("id, name, display_order")
      .eq("user_id", session.user.id)
      .eq("archived", false)
      .neq("relationship_type", "self")
      .order("display_order", { ascending: true });

    if (data) {
      setPartners(data);
    }
    setLoading(false);
  };

  const otherPartners = partners.filter(p => p.id !== currentPartnerId);

  if (loading || otherPartners.length === 0) {
    return (
      <div className="flex items-center gap-2 text-foreground/80">
        <Heart className="w-4 h-4 text-primary" />
        <span className="font-medium">{currentPartnerName}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-3 py-2 h-auto hover:bg-primary/10 transition-colors"
        >
          <Heart className="w-4 h-4 text-primary" />
          <span className="font-medium max-w-[150px] truncate">{currentPartnerName}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56 bg-card border-border shadow-soft">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Switch to...
        </div>
        {otherPartners.map((partner) => (
          <DropdownMenuItem
            key={partner.id}
            onClick={() => navigate(`/partner/${partner.id}`)}
            className="flex items-center gap-2 cursor-pointer hover:bg-primary/10 focus:bg-primary/10"
          >
            <Heart className="w-3.5 h-3.5 text-primary/60" />
            <span className="truncate">{partner.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
