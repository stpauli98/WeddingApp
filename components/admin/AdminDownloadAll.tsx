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
    <div className="flex flex-col items-center gap-6 p-8">
      <h3 className="text-xl font-bold text-yellow-700 mb-2">Preuzimanje uspomena</h3>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={onDownloadImages}
          className="w-full py-2 px-4 rounded bg-yellow-400 text-yellow-900 font-semibold shadow hover:bg-yellow-500 transition disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={!onDownloadImages || imagesCount === 0 || isDownloadingImages}
        >
          {isDownloadingImages ? (
            <>
              <span className="spinner" /> Preuzimanje slika...
            </>
          ) : (
            <>📦 Preuzmi sve slike .zip ({imagesCount})</>
          )}
        </button>
        <button
          onClick={onDownloadMessages}
          className="w-full py-2 px-4 rounded bg-yellow-50 text-yellow-800 font-semibold shadow hover:bg-yellow-100 transition disabled:opacity-60 flex items-center justify-center gap-2"
          disabled={!onDownloadMessages || messagesCount === 0 || isDownloadingMessages}
        >
          {isDownloadingMessages ? (
            <>
              <span className="spinner" /> Preuzimanje poruka...
            </>
          ) : (
            <>💌 Preuzmi sve poruke ({messagesCount})</>
          )}
        </button>
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
