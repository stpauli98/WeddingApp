import React from "react";

interface AdminDownloadAllProps {
  onDownloadImages: () => void;
  onDownloadMessages: () => void;
  imagesCount: number;
  messagesCount: number;
  isDownloadingImages?: boolean;
  isDownloadingMessages?: boolean;
}

// Prikazuje opcije za preuzimanje svih slika ili poruka
const AdminDownloadAll: React.FC<AdminDownloadAllProps> = ({
  onDownloadImages,
  onDownloadMessages,
  imagesCount,
  messagesCount,
  isDownloadingImages = false,
  isDownloadingMessages = false,
}) => {
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl">🗂️</span>
        <h3 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--lp-accent))] mb-1">Preuzimanje uspomena</h3>
        <span className="text-sm text-[hsl(var(--lp-muted-foreground))] text-center max-w-xs">Ovde možete preuzeti sve slike i poruke gostiju sa vaše svadbe, sačuvajte ih za uspomenu ili dalju obradu.</span>
      </div>
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        {/* Kartica za slike */}
        <div className="flex-1 flex flex-col items-center rounded-xl border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-card))] p-6 shadow-sm gap-4">
          <span className="text-3xl">📦</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-accent))]">Sve slike</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] mb-2">Ukupno: <b className="text-[hsl(var(--lp-text))]">{imagesCount}</b></span>
          <button
            onClick={onDownloadImages}
            className="w-full py-2 px-4 rounded-lg bg-[hsl(var(--lp-primary))] text-[hsl(var(--lp-primary-foreground))] font-semibold shadow-sm hover:bg-[hsl(var(--lp-primary))]/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={!onDownloadImages || imagesCount === 0 || isDownloadingImages}
          >
            {isDownloadingImages ? (
              <>
                <span className="spinner" /> Preuzimanje slika...
              </>
            ) : (
              <>Preuzmi .zip ({imagesCount})</>
            )}
          </button>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] text-center">Preuzmite sve slike gostiju kao ZIP arhivu spremnu za čuvanje ili deljenje.</span>
          {imagesCount === 0 && (
            <span className="text-xs text-[hsl(var(--lp-destructive))] mt-2">Nema slika za preuzimanje.</span>
          )}
        </div>
        {/* Kartica za poruke */}
        <div className="flex-1 flex flex-col items-center rounded-xl border border-[hsl(var(--lp-accent))]/20 bg-[hsl(var(--lp-card))] p-6 shadow-sm gap-4">
          <span className="text-3xl">💌</span>
          <span className="text-lg font-semibold text-[hsl(var(--lp-accent))]">Sve poruke</span>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] mb-2">Ukupno: <b className="text-[hsl(var(--lp-text))]">{messagesCount}</b></span>
          <button
            onClick={onDownloadMessages}
            className="w-full py-2 px-4 rounded-lg border border-[hsl(var(--lp-primary))] bg-[hsl(var(--lp-card))] text-[hsl(var(--lp-primary))] font-semibold shadow-sm hover:bg-[hsl(var(--lp-muted))]/30 transition disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={!onDownloadMessages || messagesCount === 0 || isDownloadingMessages}
          >
            {isDownloadingMessages ? (
              <>
                <span className="spinner" /> Preuzimanje poruka...
              </>
            ) : (
              <>Preuzmi .csv ({messagesCount})</>
            )}
          </button>
          <span className="text-xs text-[hsl(var(--lp-muted-foreground))] text-center">Sve čestitke i poruke gostiju u CSV formatu, spremno za čuvanje ili štampu.</span>
          {messagesCount === 0 && (
            <span className="text-xs text-[hsl(var(--lp-destructive))] mt-2">Nema poruka za preuzimanje.</span>
          )}
        </div>
      </div>
      <div className="w-full flex flex-col items-center gap-2 mt-2">
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--lp-accent))]/30 bg-[hsl(var(--lp-accent))]/10 px-4 py-2 text-sm text-[hsl(var(--lp-accent))] shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
          <span>Preporučujemo da redovno preuzimate slike i poruke radi čuvanja uspomena.</span>
        </div>
      </div>
      <style>{`
        .spinner {
          display: inline-block;
          width: 1.1em;
          height: 1.1em;
          border: 2.5px solid currentColor;
          border-top: 2.5px solid transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 4px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDownloadAll;
