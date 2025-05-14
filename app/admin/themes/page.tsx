"use client";

import React from "react";
import SelectEventTheme from "@/components/SelectEventTheme";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ThemesPage() {
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Odabir teme događaja</h1>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">
            Nazad na kontrolnu tablu
          </Link>
        </Button>
      </div>

      <div className="bg-card shadow-sm rounded-lg border p-6">
        <p className="text-muted-foreground mb-6">
          Odaberite temu koja najbolje odgovara vašem događaju. Tema će uticati na boje i izgled cijele aplikacije.
        </p>
        
        <SelectEventTheme />
        
        <div className="mt-10 border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Kako teme utiču na vaš događaj?</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>Svaka tema ima jedinstvenu paletu boja prilagođenu tipu događaja</li>
            <li>Teme utiču na izgled svih komponenti, dugmadi i kartica</li>
            <li>Odabrana tema će biti primijenjena na svim stranicama vašeg događaja</li>
            <li>Gosti će vidjeti vaš događaj u odabranoj temi</li>
          </ul>
          
          <div className="mt-6 p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Savjet:</strong> Odaberite temu koja najbolje odražava karakter vašeg događaja. Za svadbe preporučujemo romantičnu temu "Svadba", dok je za poslovne događaje prikladnija tema "Team Building".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
