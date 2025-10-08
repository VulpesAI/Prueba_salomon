import type { ChatMessage } from '@/lib/store/chatTypes';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-muted-foreground rounded-bl-sm'
        }`}
        role="article"
        aria-label={isUser ? 'Mensaje de usuario' : 'Mensaje de asistente'}
      >
        {message.content ? (
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        ) : (
          <span className="opacity-60">…</span>
        )}
      </div>
    </div>
  );
}

export default ChatBubble;
