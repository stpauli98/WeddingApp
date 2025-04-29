import React from "react";

interface GuestCardProps {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    images: { imageUrl: string }[];
    message?: { text: string } | null;
    createdAt: string | Date;
  };
}

const GuestCard: React.FC<GuestCardProps> = ({ guest }) => {
  return (
    <div className="relative bg-white rounded-xl shadow border flex flex-col min-h-[240px]">
      {/* Prva slika gosta ili placeholder */}
      {guest.images && guest.images.length > 0 ? (
        <img
          src={guest.images[0].imageUrl}
          alt={`Slika gosta: ${guest.firstName} ${guest.lastName}`}
          className="w-full h-40 object-cover rounded-t-xl border-b"
          style={{ minHeight: '160px', background: '#f7fafc' }}
        />
      ) : (
        <div className="w-full h-40 flex items-center justify-center rounded-t-xl border-b bg-gray-100 text-4xl text-yellow-400 font-bold select-none" style={{ minHeight: '160px' }} role="img" aria-label="Gost bez slike">
          {guest.firstName?.[0] || ''}{guest.lastName?.[0] || ''}
        </div>
      )}
      <div className="flex items-center gap-2 px-4 pt-4">
        <span className="font-semibold text-base text-yellow-700 flex-1 truncate">{guest.firstName} {guest.lastName}</span>
      </div>
      <div className="flex-1 flex flex-col justify-between px-4 pb-4 pt-2">
        <div className="flex items-start gap-2 min-h-[100px] max-h-[180px] overflow-y-auto">
          <svg className="mt-1 h-5 w-5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          <p className="text-sm text-gray-600 max-h-[160px] overflow-y-auto">
            {guest.message && guest.message.text ? guest.message.text : <span className="italic text-gray-400">Nema poruke</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3v4M8 3v4M4 11h16" /></svg>
        <span className="text-sm text-gray-600">{guest.images.length} slika</span>
      </div>
      <div className="text-xs text-gray-400 mt-2">
        Prijavljen: {new Date(guest.createdAt).toLocaleString('sr-latn', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="absolute bottom-0 left-0 w-full bg-white/90 p-4 border-t z-10">
        <a href={`/admin/dashboard/guest/${guest.id}`} className="block w-full text-center bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded py-2 transition">Pregledaj sve slike</a>
      </div>
    </div>
  );
};

export default GuestCard;
