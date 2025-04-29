import React from "react";

interface AdminDashboardStatsProps {
  guestsCount: number;
  imagesCount: number;
  messagesCount: number;
  lastUpload?: string | null;
}

// Moderni prikaz statistike za admin dashboard
const AdminDashboardStats: React.FC<AdminDashboardStatsProps> = ({ guestsCount, imagesCount, messagesCount, lastUpload }) => {
  return (
    <div className="w-full max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
      <div className="flex flex-col items-center bg-white/80 rounded-xl p-6 border border-yellow-100 shadow gap-2">
        <span className="text-3xl" role="img" aria-label="Gosti">🧑‍🤝‍🧑</span>
        <span className="text-lg font-bold text-yellow-700">Gosti</span>
        <span className="text-2xl text-gray-800 font-extrabold">{guestsCount}</span>
        <span className="text-xs text-gray-400">Ukupno registrovanih gostiju</span>
      </div>
      <div className="flex flex-col items-center bg-white/80 rounded-xl p-6 border border-yellow-100 shadow gap-2">
        <span className="text-3xl" role="img" aria-label="Slike">🖼️</span>
        <span className="text-lg font-bold text-yellow-700">Slike</span>
        <span className="text-2xl text-gray-800 font-extrabold">{imagesCount}</span>
        <span className="text-xs text-gray-400">Ukupno uploadovanih slika</span>
      </div>
      <div className="flex flex-col items-center bg-white/80 rounded-xl p-6 border border-yellow-100 shadow gap-2">
        <span className="text-3xl" role="img" aria-label="Poruke">💬</span>
        <span className="text-lg font-bold text-yellow-700">Poruke</span>
        <span className="text-2xl text-gray-800 font-extrabold">{messagesCount}</span>
        <span className="text-xs text-gray-400">Ukupno ostavljenih poruka</span>
      </div>
      {lastUpload && (
        <div className="col-span-full text-center text-xs text-gray-500 mt-2">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Sat" role="img"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
            Poslednji upload: <b>{new Date(lastUpload).toLocaleString('sr-latn')}</b>
          </span>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardStats;
