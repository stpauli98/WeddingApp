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
      <div className="flex flex-col items-center rounded-xl border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-card))] p-6 shadow-sm gap-2">
        <span className="text-3xl" role="img" aria-label="Gosti">🧑‍🤝‍🧑</span>
        <span className="text-lg font-semibold text-[hsl(var(--lp-accent))]">Gosti</span>
        <span className="text-2xl font-extrabold text-[hsl(var(--lp-text))]">{guestsCount}</span>
        <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Ukupno registrovanih gostiju</span>
      </div>
      <div className="flex flex-col items-center rounded-xl border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-card))] p-6 shadow-sm gap-2">
        <span className="text-3xl" role="img" aria-label="Slike">🖼️</span>
        <span className="text-lg font-semibold text-[hsl(var(--lp-accent))]">Slike</span>
        <span className="text-2xl font-extrabold text-[hsl(var(--lp-text))]">{imagesCount}</span>
        <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Ukupno uploadovanih slika</span>
      </div>
      <div className="flex flex-col items-center rounded-xl border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-card))] p-6 shadow-sm gap-2">
        <span className="text-3xl" role="img" aria-label="Poruke">💬</span>
        <span className="text-lg font-semibold text-[hsl(var(--lp-accent))]">Poruke</span>
        <span className="text-2xl font-extrabold text-[hsl(var(--lp-text))]">{messagesCount}</span>
        <span className="text-xs text-[hsl(var(--lp-muted-foreground))]">Ukupno ostavljenih poruka</span>
      </div>
      {lastUpload && (
        <div className="col-span-full text-center text-xs text-[hsl(var(--lp-muted-foreground))] mt-2">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4 text-[hsl(var(--lp-accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Sat" role="img"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
            Poslednji upload: <b className="text-[hsl(var(--lp-text))]">{new Date(lastUpload).toLocaleString('sr-latn')}</b>
          </span>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardStats;
