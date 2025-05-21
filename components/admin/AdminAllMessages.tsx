import React from "react";

interface MessageData {
  id: string;
  text: string;
  guestName?: string;
  createdAt: string | Date;
}

interface AdminAllMessagesProps {
  messages: MessageData[];
}

// Prikazuje sve poruke gostiju kao knjigu utisaka
const AdminAllMessages: React.FC<AdminAllMessagesProps> = ({ messages }) => {
  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[hsl(var(--lp-muted-foreground))]">
        <span className="text-6xl mb-2">💬</span>
        <div className="italic mb-2">Nema poruka od gostiju.</div>
        <div className="text-sm text-[hsl(var(--lp-muted-foreground))] text-center max-w-xs">Kada gosti ostave čestitku ili poruku, ovde će se pojaviti njihove lepe reči i želje za mladence.</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(msg => (
        <div key={msg.id} className="relative flex flex-col gap-2 bg-white/80 border border-[hsl(var(--lp-accent))]/20 rounded-2xl shadow-lg p-5 min-h-[120px]">
          <svg className="absolute -top-4 left-4 text-2xl" aria-label="Poruka gosta" role="img">💌</svg>
          <div className="text-base text-[hsl(var(--lp-text))] font-medium mb-1 mt-2 whitespace-pre-line">{msg.text}</div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-semibold text-[hsl(var(--lp-accent))] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Gost" role="img"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" /></svg>
              {msg.guestName ? msg.guestName : 'Nepoznat gost'}
            </span>
            <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">
              {typeof msg.createdAt === 'string' ? new Date(msg.createdAt).toLocaleString('sr-latn') : msg.createdAt.toLocaleString('sr-latn')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminAllMessages;
