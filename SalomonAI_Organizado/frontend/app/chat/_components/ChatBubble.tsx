import type { ChatMessage } from '@/lib/store/chatTypes';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[80%] text-sm px-3 py-2 rounded-2xl border border-soft shadow-none',
          isUser
            ? 'rounded-br-sm bg-[rgba(0,124,240,0.2)] text-primary'
            : 'rounded-bl-sm bg-[rgba(255,255,255,0.08)] text-primary'
        ].join(' ')}
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
