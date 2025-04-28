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
        <h3 className="text-2xl font-extrabold text-yellow-700 mb-1 tracking-tight">Preuzimanje uspomena</h3>
        <span className="text-sm text-gray-500 text-center max-w-xs">Ovde možete preuzeti sve slike i poruke gostiju sa vaše svadbe, sačuvajte ih za uspomenu ili dalju obradu.</span>
      </div>
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        {/* Kartica za slike */}
        <div className="flex-1 flex flex-col items-center bg-white/80 rounded-xl p-6 border border-yellow-100 shadow-sm gap-4">
          <span className="text-3xl">📦</span>
          <span className="text-lg font-semibold text-yellow-700">Sve slike</span>
          <span className="text-xs text-gray-500 mb-2">Ukupno: <b>{imagesCount}</b></span>
          <button
            onClick={onDownloadImages}
            className="w-full py-2 px-4 rounded-lg bg-yellow-400 text-yellow-900 font-semibold shadow hover:bg-yellow-500 transition disabled:opacity-60 flex items-center justify-center gap-2"
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
          <span className="text-xs text-gray-400 text-center">Preuzmite sve slike gostiju kao ZIP arhivu spremnu za čuvanje ili deljenje.</span>
          {imagesCount === 0 && (
            <span className="text-xs text-red-400 mt-2">Nema slika za preuzimanje.</span>
          )}
        </div>
        {/* Kartica za poruke */}
        <div className="flex-1 flex flex-col items-center bg-white/80 rounded-xl p-6 border border-yellow-100 shadow-sm gap-4">
          <span className="text-3xl">💌</span>
          <span className="text-lg font-semibold text-yellow-700">Sve poruke</span>
          <span className="text-xs text-gray-500 mb-2">Ukupno: <b>{messagesCount}</b></span>
          <button
            onClick={onDownloadMessages}
            className="w-full py-2 px-4 rounded-lg bg-yellow-50 text-yellow-800 font-semibold shadow hover:bg-yellow-100 transition disabled:opacity-60 flex items-center justify-center gap-2"
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
          <span className="text-xs text-gray-400 text-center">Sve čestitke i poruke gostiju u CSV formatu, spremno za čuvanje ili štampu.</span>
          {messagesCount === 0 && (
            <span className="text-xs text-red-400 mt-2">Nema poruka za preuzimanje.</span>
          )}
        </div>
      </div>
      <div className="w-full flex flex-col items-center gap-2 mt-2">
        <div className="flex items-center gap-2 bg-yellow-100/80 border border-yellow-300 rounded-lg px-4 py-2 text-yellow-800 text-sm shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
          <span>Preporučujemo da redovno preuzimate slike i poruke radi čuvanja uspomena.</span>
        </div>
      </div>
      <style>{`
        .spinner {
          display: inline-block;
          width: 1.1em;
          height: 1.1em;
          border: 2.5px solid #e3c75c;
          border-top: 2.5px solid #fffbe7;
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
