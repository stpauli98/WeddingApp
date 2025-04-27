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
    return <div className="text-center text-gray-400 italic py-12">Nema poruka od gostiju.</div>;
  }
  return (
    <div className="space-y-4">
      {messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(msg => (
        <div key={msg.id} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
          <div className="text-sm text-gray-700 mb-1">{msg.text}</div>
          <div className="text-xs text-gray-500 flex justify-between">
            <span>{msg.guestName ? msg.guestName : 'Nepoznat gost'}</span>
            <span>{typeof msg.createdAt === 'string' ? new Date(msg.createdAt).toLocaleString('sr-latn') : msg.createdAt.toLocaleString('sr-latn')}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminAllMessages;
