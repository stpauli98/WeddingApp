"use client";

import { use, useEffect, useState } from "react";
import { getGuestFromCache, setGuestInCache } from "@/lib/guestCache";
import { useRouter } from "next/navigation";
import { AdminImageGallery } from "../../../../../components/admin/AdminImageGallery";
import { formatDate } from "@/lib/formatDate";
import { GuestMessage } from "@/components/guest/GuestMessage";
import type { GuestDetail } from "@/components/ui/types";

export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funkcija za fetch podataka (koristi se i za refresh)
  const fetchGuest = (force = false) => {
    // Ako nije force refresh, proveri keš
    if (!force) {
      const cached = getGuestFromCache(id);
      if (cached) {
        setGuest(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    fetch(`/api/admin/guest/${id}`)
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Nepoznata greška.");
          setGuest(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setGuest(data);
        setGuestInCache(id, data); // upiši u keš
        setLoading(false);
      })
      .catch(() => {
        setError("Greška pri komunikaciji sa serverom.");
        setGuest(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="container mx-auto p-8">Učitavanje...</div>;
  }

  if (error || !guest) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">{error === "NOT_FOUND" ? "Gost nije pronađen" : error || "Greška"}</h1>
        <button
          type="button"
          onClick={() => router.replace("/admin/dashboard")}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Nazad na dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Detalji gosta: {guest.firstName} {guest.lastName}</h1>
      <div className="mb-4 text-gray-600 text-sm">
        Email: {guest.email} <br />
        Prijavljen: {formatDate(guest.createdAt)}
      </div>
      <div className="mb-6">
        <GuestMessage message={guest.message?.text ? { text: guest.message.text } : undefined} />
      </div>
      <div>
        <span className="font-semibold">Slike gosta ({guest.images.length}):</span>
        <div className="mt-2">
          <AdminImageGallery images={guest.images} />
        </div>
      </div>
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => fetchGuest(true)}
          className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Osvežavanje..." : "Osveži podatke"}
        </button>
        <button
          type="button"
          onClick={() => router.replace("/admin/dashboard")}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Nazad na dashboard
        </button>
      </div>
    </div>
  );
}
