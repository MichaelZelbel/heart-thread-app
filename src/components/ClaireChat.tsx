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
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const loadChatHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Load partner name if partnerId is provided
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

        // Load ALL chat history for the user (continuous conversation)
        const { data: historyData } = await supabase
          .from('claire_chat_messages')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });

        if (historyData && historyData.length > 0) {
          setMessages(historyData.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })));
        } else {
          // Show welcome message if no history
          const welcomeMsg = partnerId && partnerName
            ? `Hi! I'm here to help you connect even more deeply with ${partnerName}. 💗 I can suggest thoughtful activities, gift ideas, conversation starters, and more based on what you've shared about them. What would you like to explore?`
            : "Hi! I'm Claire, your heart companion. 💕 I'm here to help you strengthen your relationships with thoughtful suggestions, gift ideas, and conversation starters. What would you like to explore today?";
          
          setMessages([{ role: 'assistant', content: welcomeMsg }]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [partnerId]);

  // Auto-scroll to bottom when messages change or loading completes
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // Use setTimeout to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, loadingHistory]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    const newUserMessage = { role: 'user' as const, content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to chat with Claire");
        return;
      }

      // Save user message to database
      await supabase.from('claire_chat_messages').insert({
        user_id: session.user.id,
        partner_id: partnerId || null,
        role: 'user',
        content: userMessage
      });

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
        const assistantMessage = { role: 'assistant' as const, content: data.reply };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Save assistant message to database
        await supabase.from('claire_chat_messages').insert({
          user_id: session.user.id,
          partner_id: partnerId || null,
          role: 'assistant',
          content: data.reply
        });
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
          {loadingHistory ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-sm text-muted-foreground">Loading chat history...</p>
            </div>
          ) : (
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
              <div ref={messagesEndRef} />
            </div>
          )}
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
