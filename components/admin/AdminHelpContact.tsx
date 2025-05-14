import React from "react";

const AdminHelpContact: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto p-6 bg-card rounded-xl shadow-md border border-muted flex flex-col gap-5">
      <div className="flex items-center gap-4 border-b border-muted pb-4">
        <div className="bg-primary p-3 rounded-full">
          <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Vaš vjenčani album</h3>
          <p className="text-sm text-muted-foreground">Upravljajte uspomenama s vašeg posebnog dana</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-foreground">Galerija uspomena</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Pregledajte sve fotografije koje su vaši gosti podijelili. Svaka slika je dragocjena uspomena s vašeg posebnog dana.
          </p>
          <div className="flex items-center gap-1 text-xs text-primary">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Sve slike možete preuzeti i sačuvati zauvijek</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 p-4 bg-accent/10 rounded-lg border border-accent/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-accent/20 p-2 rounded-lg">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h4 className="font-semibold text-foreground">Čestitke i poruke</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Čitajte tople želje i čestitke vaših najmilijih. Svaka poruka je jedinstvena i odražava ljubav koju vam šalju.
          </p>
          <div className="flex items-center gap-1 text-xs text-accent">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Kreirajte knjigu čestitki u PDF formatu</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h4 className="font-semibold text-foreground">QR kod za goste</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Podijelite jedinstveni QR kod s vašim gostima kako bi jednostavno pristupili i podijelili svoje fotografije.
          </p>
          <div className="flex items-center gap-1 text-xs text-primary">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Isprintajte QR kod za stolove na vjenčanju</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 p-4 bg-accent/10 rounded-lg border border-accent/20 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="bg-accent/20 p-2 rounded-lg">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h4 className="font-semibold text-foreground">Vaša jedinstvena poveznica</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Kopirajte i podijelite vašu personaliziranu poveznicu putem društvenih mreža ili poruka s vašim gostima.
          </p>
          <div className="flex items-center gap-1 text-xs text-accent">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>www.mojasvadbaa.com/vas-event</span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground">Trebate pomoć?</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Tu smo za vas u svakom trenutku. Ako imate pitanja ili trebate podršku, slobodno nas kontaktirajte.  
        </p>
        <a 
          href="mailto:pixelnext9@gmail.com" 
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Kontaktirajte nas
        </a>
      </div>
      
      <div className="flex items-center justify-center gap-2 mt-1">
        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-muted-foreground">Vaše uspomene su sigurne i privatne</p>
      </div>
    </div>
  );
};

export default AdminHelpContact;
