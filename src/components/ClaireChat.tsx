import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Send, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAICreditsGate } from "@/hooks/useAICreditsGate";
import { ClaireChatMessages } from "@/components/claire/ClaireChatMessages";
import { ClaireChatInput } from "@/components/claire/ClaireChatInput";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaireChatProps {
  partnerId?: string;
  partnerName?: string;
  compact?: boolean;
  prefillMessage?: string;
  messageCoachContext?: {
    transcript: string;
    notes: string;
    presetTone: string;
    customTone: string;
  };
}

export const ClaireChat = ({ partnerId, partnerName: initialPartnerName, compact = false, prefillMessage = "", messageCoachContext }: ClaireChatProps) => {
  const [partnerName, setPartnerName] = useState<string>(initialPartnerName || "");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { checkCredits, refetchCredits } = useAICreditsGate();

  useEffect(() => {
    const loadChatHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        if (partnerId) {
          const { data } = await supabase
            .from("partners")
            .select("name")
            .eq("id", partnerId)
            .single();
          if (data) {
            setPartnerName(data.name);
          }
        }

        let query = supabase
          .from('claire_chat_messages')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (partnerId) {
          query = query.eq('partner_id', partnerId);
        } else {
          query = query.is('partner_id', null);
        }

        const { data: historyData } = await query;

        if (historyData && historyData.length > 0) {
          setMessages(historyData.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })));
        } else {
          const displayName = partnerId ? (partnerName || "your cherished one") : null;
          const welcomeMsg = displayName
            ? `Hi! I'm here to help you connect even more deeply with ${displayName}. 💗 I can suggest thoughtful activities, gift ideas, conversation starters, and more based on what you've shared about them. What would you like to explore?`
            : "Hi! I'm Claire, your heart companion. 💕 I'm here to help you strengthen your relationships with thoughtful suggestions, gift ideas, and conversation starters. What would you like to explore today?";
          
          setMessages([{ role: 'assistant', content: welcomeMsg }]);
        }
        
        if (prefillMessage) {
          setInput(prefillMessage);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [partnerId, prefillMessage]);

  const scrollToBottom = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    const root = ref.current;
    if (!root) return;
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => scrollToBottom(scrollRef), 50);
    const t2 = setTimeout(() => scrollToBottom(fullscreenScrollRef), 50);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, loadingHistory, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!checkCredits()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to chat with Claire");
        return;
      }

      await supabase.from('claire_chat_messages').insert({
        user_id: session.user.id,
        partner_id: partnerId || null,
        role: 'user',
        content: userMessage
      });

      const { data, error } = await supabase.functions.invoke('claire-chat', {
        body: { message: userMessage, partnerId, messageCoachContext },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        console.error('Error calling claire-chat:', error);
        toast.error("Sorry, I couldn't process that. Please try again.");
        return;
      }

      if (data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        await supabase.from('claire_chat_messages').insert({
          user_id: session.user.id,
          partner_id: partnerId || null,
          role: 'assistant',
          content: data.reply
        });
        refetchCredits();
      } else {
        toast.error("I didn't get a response. Please try again.");
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const title = partnerName ? `${partnerName}'s Claire 💗` : "Claire – Your Heart Companion";

  if (compact && !expanded) {
    return (
      <Card 
        className="shadow-soft cursor-pointer hover:shadow-glow transition-shadow"
        onClick={() => setExpanded(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
          {messages.length > 1 && (
            <CardDescription className="line-clamp-2 text-xs mt-2">
              {messages[messages.length - 1].content}
            </CardDescription>
          )}
        </CardHeader>
      </Card>
    );
  }

  const chatContent = (isFullscreen: boolean) => (
    <CardContent className="flex-1 flex flex-col p-4 space-y-3 min-h-0">
      <ScrollArea 
        ref={isFullscreen ? fullscreenScrollRef : scrollRef}
        className="flex-1 pr-4"
      >
        <ClaireChatMessages messages={messages} loading={loading} loadingHistory={loadingHistory} />
      </ScrollArea>

      <div className="pt-3 border-t space-y-2">
        <ClaireChatInput
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          loading={loading}
        />
        <p className="text-xs text-muted-foreground text-center">
          Claire uses your saved Cherished info to personalize suggestions. Nothing is shared.
        </p>
      </div>
    </CardContent>
  );

  return (
    <>
      <Card className="shadow-soft flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen(true)}
                className="h-8 w-8 p-0"
                title="Expand to fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              {compact && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setExpanded(false)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <CardDescription className="text-xs">
            AI-powered relationship guidance
          </CardDescription>
        </CardHeader>
        
        {chatContent(false)}
      </Card>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullscreen(false)}
              className="h-8 w-8 p-0"
              title="Collapse to inline view"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            {chatContent(true)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
