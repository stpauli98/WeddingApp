"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Definisanje tipova tema
export type ThemeType = "wedding" | "birthday" | "teambuilding" | "other";

// Definisanje interfejsa za kontekst
interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  themeLabels: Record<ThemeType, string>;
}

// Kreiranje konteksta
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Definisanje naziva tema na ijekavici
const themeLabels: Record<ThemeType, string> = {
  wedding: "Svadba",
  birthday: "Rođendan",
  teambuilding: "Team Building",
  other: "Ostalo"
};

// Provider komponenta
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Koristimo localStorage za pamćenje odabrane teme (samo na klijentu)
  const [theme, setTheme] = useState<ThemeType>("wedding");
  
  useEffect(() => {
    // Učitavanje teme iz localStorage-a kada se komponenta montira
    const savedTheme = localStorage.getItem("event-theme") as ThemeType;
    if (savedTheme && ["wedding", "birthday", "teambuilding", "other"].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Ažuriranje klase na body elementu kada se tema promijeni
    document.body.className = `theme-${theme}`;
    
    // Spremanje teme u localStorage
    localStorage.setItem("event-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeLabels }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook za korištenje teme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
