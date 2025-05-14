"use client";

import React from "react";
import { useTheme, ThemeType } from "@/contexts/ThemeContext";

interface ThemeOption {
  id: ThemeType;
  icon: string;
  description: string;
}

export default function SelectEventTheme() {
  const { theme, setTheme, themeLabels } = useTheme();

  const themeOptions: ThemeOption[] = [
    {
      id: "wedding",
      icon: "💍",
      description: "Idealno za vjenčanja i proslave ljubavi"
    },
    {
      id: "birthday",
      icon: "🎂",
      description: "Savršeno za rođendane i veselje"
    },
    {
      id: "teambuilding",
      icon: "🏢",
      description: "Profesionalni izgled za poslovne događaje"
    },
    {
      id: "other",
      icon: "🎭",
      description: "Univerzalni dizajn za sve ostale prilike"
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-6 text-center">Odaberite temu događaja</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themeOptions.map((option) => (
          <div
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={`
              p-4 rounded-lg cursor-pointer transition-all duration-300
              border-2 flex items-center gap-4
              ${theme === option.id 
                ? "border-primary bg-primary/10 shadow-md" 
                : "border-muted hover:border-primary/50"}
            `}
          >
            <div className="text-4xl">{option.icon}</div>
            <div>
              <h3 className="font-medium text-lg">{themeLabels[option.id]}</h3>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
            {theme === option.id && (
              <div className="ml-auto">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 text-primary-foreground" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-card">
        <h3 className="text-lg font-medium mb-2">Pregled trenutne teme</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
              Primarna dugmad
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md">
              Sekundarna dugmad
            </button>
            <button className="px-4 py-2 bg-accent text-accent-foreground rounded-md">
              Akcent dugmad
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="p-3 bg-muted rounded-md text-foreground">
              Prigušena pozadina
            </div>
            <div className="p-3 border rounded-md">
              Element s bordurom
            </div>
            <div className="p-3 bg-destructive text-destructive-foreground rounded-md">
              Upozorenje
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
