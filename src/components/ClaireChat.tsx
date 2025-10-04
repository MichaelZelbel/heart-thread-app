import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaireChatProps {
  partnerId?: string;
  compact?: boolean;
}

export const ClaireChat = ({ partnerId, compact = false }: ClaireChatProps) => {
  const [partnerName, setPartnerName] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getWelcomeMessage = () => {
    if (partnerId && partnerName) {
      return `Hi! I'm here to help you connect even more deeply with ${partnerName}. 💗 I can suggest thoughtful activities, gift ideas, conversation starters, and more based on what you've shared about them. What would you like to explore?`;
    }
    return "Hi! I'm Claire, your heart companion. 💕 I'm here to help you strengthen your relationships with thoughtful suggestions, gift ideas, and conversation starters. What would you like to explore today?";
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: getWelcomeMessage()
    }
  ]);

  useEffect(() => {
    const fetchPartnerName = async () => {
      if (partnerId) {
        const { data } = await supabase
          .from("partners")
          .select("name")
          .eq("id", partnerId)
          .single();
        if (data) {
          setPartnerName(data.name);
          setMessages([{
            role: 'assistant',
            content: `Hi! I'm here to help you connect even more deeply with ${data.name}. 💗 I can suggest thoughtful activities, gift ideas, conversation starters, and more based on what you've shared about them. What would you like to explore?`
          }]);
        }
      }
    };
    fetchPartnerName();
  }, [partnerId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

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

      const { data, error } = await supabase.functions.invoke('claire-chat', {
        body: { message: userMessage, partnerId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error calling claire-chat:', error);
        toast.error("Sorry, I couldn't process that. Please try again.");
        return;
      }

      if (data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
              <CardTitle className="text-base">
                {partnerId ? "Chat with Claire 💗" : "Claire – Your Heart Companion"}
              </CardTitle>
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

  return (
    <Card className="shadow-soft flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">
              {partnerId ? "Chat with Claire 💗" : "Claire – Your Heart Companion"}
            </CardTitle>
          </div>
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
        <CardDescription className="text-xs">
          AI-powered relationship guidance
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-3 min-h-0">
        <ScrollArea 
          ref={scrollRef}
          className="flex-1 pr-4"
        >
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <p className="text-sm text-muted-foreground">Claire is thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="pt-3 border-t space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Ask Claire for suggestions..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Claire uses your saved Cherished info to personalize suggestions. Nothing is shared.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
