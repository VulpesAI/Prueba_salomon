'use client';

import { useEffect, useRef } from 'react';

import type { ChatMessage } from '@/lib/store/chatTypes';

import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';

export function MessageList({ items, typing }: { items: ChatMessage[]; typing: boolean }) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [items, typing]);

  return (
    <div
      ref={listRef}
      className="h-[60vh] overflow-y-auto space-y-2 rounded-xl border p-2"
      role="log"
      aria-live="polite"
      aria-label="Historial de la conversación"
    >
      {items.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}
      {typing ? <TypingIndicator /> : null}
    </div>
  );
}

export default MessageList;
