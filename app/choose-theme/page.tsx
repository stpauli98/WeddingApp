"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTheme, ThemeType } from "@/contexts/ThemeContext";
import Image from "next/image";

interface ThemeOption {
  id: ThemeType;
  title: string;
  icon: string;
  description: string;
  image: string;
}

export default function ChooseThemePage() {
  const { theme, setTheme, themeLabels } = useTheme();
  const router = useRouter();

  const themeOptions: ThemeOption[] = [
    {
      id: "wedding",
      title: "Svadba",
      icon: "💍",
      description: "Idealno za vjenčanja i proslave ljubavi",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/jeremy-wong-weddings-464ps_nOflw-unsplash.jpg-vgCJXLrTmNrEVnDt4NNSCtmFsQpHpt.jpeg"
    },
    {
      id: "birthday",
      title: "Rođendan",
      icon: "🎂",
      description: "Savršeno za rođendane i veselje",
      image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=2070&auto=format&fit=crop"
    },
    {
      id: "teambuilding",
      title: "Team Building",
      icon: "🏢",
      description: "Profesionalni izgled za poslovne događaje",
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=2070&auto=format&fit=crop"
    },
    {
      id: "other",
      title: "Ostalo",
      icon: "🎭",
      description: "Univerzalni dizajn za sve ostale prilike",
      image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070&auto=format&fit=crop"
    }
  ];

  // Funkcija za odabir teme i preusmjeravanje na registraciju
  const handleThemeSelect = (selectedTheme: ThemeType) => {
    setTheme(selectedTheme);
    router.push("/admin/register");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Odaberite tip vašeg događaja</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Izaberite tip događaja koji najbolje odgovara vašoj prilici. Ovo će prilagoditi izgled i funkcionalnosti aplikacije vašim potrebama.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {themeOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleThemeSelect(option.id)}
              className={`
                relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300
                border-2 group hover:shadow-xl
                ${theme === option.id ? "border-primary ring-2 ring-primary ring-opacity-50" : "border-muted hover:border-primary/50"}
              `}
            >
              {/* Slika pozadine */}
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={option.image}
                  alt={option.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              
              {/* Sadržaj */}
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{option.icon}</span>
                  <h3 className="text-2xl font-bold">{option.title}</h3>
                </div>
                <p className="text-muted-foreground mb-4">{option.description}</p>
                <Button 
                  variant={theme === option.id ? "default" : "outline"}
                  className="w-full"
                >
                  {theme === option.id ? "Odabrano" : "Odaberi"}
                </Button>
              </div>
              
              {/* Indikator odabira */}
              {theme === option.id && (
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-primary-foreground" 
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
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/">
              Nazad na početnu
            </Link>
          </Button>
          <Button onClick={() => router.push("/admin/register")}>
            Nastavi na registraciju
          </Button>
        </div>
      </div>
    </div>
  );
}
