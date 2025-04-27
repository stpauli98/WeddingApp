import React from "react";

const AdminHelpContact: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto p-8 bg-white/70 rounded-lg shadow flex flex-col gap-4 items-center">
      <h3 className="text-xl font-bold text-yellow-700 mb-2">Pomoć & Kontakt</h3>
      <div className="text-gray-700 text-sm text-center">
        <p>Dobrodošli u admin panel vaše svadbe! Ovde možete pregledati slike i poruke gostiju, preuzeti sve uspomene i uživati u rezultatima vaše proslave.</p>
        <ul className="list-disc list-inside text-left mt-2 mb-2">
          <li>Za sva pitanja ili probleme, kontaktirajte podršku na <a href="mailto:weddingapp.support@email.com" className="text-yellow-700 underline">weddingapp.support@email.com</a>.</li>
          <li>Preporučujemo da redovno preuzimate slike i poruke radi čuvanja uspomena.</li>
          <li>Ako primetite tehnički problem, pokušajte da osvežite stranicu ili se ponovo prijavite.</li>
        </ul>
        <p>Hvala što koristite našu aplikaciju i želimo vam mnogo sreće i lepih uspomena! 💛</p>
      </div>
    </div>
  );
};

export default AdminHelpContact;
