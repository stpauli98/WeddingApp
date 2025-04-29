import React from "react";

const AdminHelpContact: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto p-8 bg-gradient-to-br from-blue-50 via-white/80 to-yellow-50 rounded-2xl shadow-lg flex flex-col gap-6 items-center border border-blue-100">
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl animate-bounce">🤝</span>
        <h3 className="text-2xl font-extrabold text-blue-700 mb-1 tracking-tight">Pomoć & Podrška</h3>
        <span className="text-sm text-gray-500">Vaš digitalni asistent za admin panel</span>
      </div>
      <div className="w-full flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-2 bg-white/80 rounded-xl p-4 border border-yellow-100 shadow-sm">
          <h4 className="font-semibold text-yellow-700 mb-1 text-base flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="FAQ" role="img"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9" /></svg>
            Najčešća pitanja (FAQ)
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li><span className="font-semibold text-gray-900">Kako preuzeti sve slike?</span> — U tabu <b>Preuzimanje</b> kliknite na odgovarajuće dugme za eksport.</li>
            <li><span className="font-semibold text-gray-900">Ne vidim slike gosta?</span> — Proverite da li je gost uspešno uploadovao slike i da li je stranica osvežena.</li>
            <li><span className="font-semibold text-gray-900">Kako kontaktirati podršku?</span> — Pišite nam na <a href="mailto:weddingapp.support@email.com" className="text-yellow-700 underline" title="Pošalji email podršci">weddingapp.support@email.com</a>.</li>
            <li><span className="font-semibold text-gray-900">Mogu li izbrisati sliku?</span> — Da, klikom na ikonicu korpe pored slike u galeriji.</li>
          </ul>
        </div>
        <div className="flex-1 flex flex-col gap-2 bg-white/80 rounded-xl p-4 border border-blue-100 shadow-sm">
          <h4 className="font-semibold text-blue-700 mb-1 text-base flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="FAQ" role="img"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12v2a4 4 0 01-8 0v-2" /><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 16v2a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            Kontaktirajte nas
          </h4>
          <div className="text-sm text-gray-700">
            <p>Naš tim za podršku je tu za vas svaki dan od 9 do 18h.</p>
            <p className="mt-1">Email: <a href="mailto:weddingapp.support@email.com" className="text-blue-700 underline font-semibold" title="Pošalji email podršci">weddingapp.support@email.com</a></p>
            <p className="mt-1">Odgovaramo u roku od 24h.</p>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col items-center gap-2 mt-2">
        <div className="flex items-center gap-2 bg-yellow-100/80 border border-yellow-300 rounded-lg px-4 py-2 text-yellow-800 text-sm shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="FAQ" role="img"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
          <span>Preporučujemo da redovno preuzimate slike i poruke radi čuvanja uspomena.</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Hvala što koristite našu aplikaciju i želimo vam mnogo sreće i lepih uspomena! 💛</p>
      </div>
    </div>
  );
};

export default AdminHelpContact;
