import React from "react";

export default function DevNotice() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="max-w-md w-full bg-card border-2 border-primary rounded-2xl p-10 shadow-2xl flex flex-col items-center">
        <span className="text-3xl font-bold text-primary mb-4">⚠️</span>
        <h1 className="text-2xl font-semibold mb-2 text-center">Aplikacija je trenutno u razvoju</h1>
        <p className="text-center text-gray-600 mb-4">Ova aplikacija trenutno nije dostupna za korišćenje.<br/>Molimo vas da pokušate kasnije.</p>
      </div>
    </div>
  );
}
