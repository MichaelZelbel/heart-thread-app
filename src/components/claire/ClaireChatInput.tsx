import { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface ClaireChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  loading: boolean;
}

const LINE_HEIGHT = 20;
const MIN_ROWS = 2;
const MAX_ROWS = 15;

export const ClaireChatInput = ({ input, setInput, onSend, loading }: ClaireChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const minHeight = LINE_HEIGHT * MIN_ROWS + 16; // 16 for py-2
    const maxHeight = LINE_HEIGHT * MAX_ROWS + 16;
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollH, minHeight), maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <textarea
        ref={textareaRef}
        placeholder="Ask Claire for suggestions..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        rows={MIN_ROWS}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ lineHeight: `${LINE_HEIGHT}px` }}
      />
      <Button 
        onClick={onSend} 
        disabled={loading || !input.trim()}
        size="icon"
        className="shrink-0"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
};
