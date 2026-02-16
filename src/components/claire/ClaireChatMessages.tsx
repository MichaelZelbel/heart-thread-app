interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaireChatMessagesProps {
  messages: Message[];
  loading: boolean;
  loadingHistory: boolean;
}

export const ClaireChatMessages = ({ messages, loading, loadingHistory }: ClaireChatMessagesProps) => {
  if (loadingHistory) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-sm text-muted-foreground">Loading chat history...</p>
      </div>
    );
  }

  return (
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
  );
};
