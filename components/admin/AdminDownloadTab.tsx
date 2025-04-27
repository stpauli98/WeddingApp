"use client";
import React from "react";
import AdminDownloadAll from "./AdminDownloadAll";

interface AdminDownloadTabProps {
  imagesCount: number;
  messagesCount: number;
}

const AdminDownloadTab: React.FC<AdminDownloadTabProps> = ({ imagesCount, messagesCount }) => {
  // Ove funkcije su sada bezbedno klijentske
  const handleDownloadImages = async () => {
    try {
      const res = await fetch("/api/admin/download/images");
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "slike.zip";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    } catch (err: any) {
      alert("Greška pri preuzimanju slika: " + (err?.message || err));
    }
  };

  const handleDownloadMessages = async () => {
    try {
      const res = await fetch("/api/admin/download/messages");
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "poruke.csv";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    } catch (err: any) {
      alert("Greška pri preuzimanju poruka: " + (err?.message || err));
    }
  };

  return (
    <AdminDownloadAll
      imagesCount={imagesCount}
      messagesCount={messagesCount}
      onDownloadImages={handleDownloadImages}
      onDownloadMessages={handleDownloadMessages}
    />
  );
};

export default AdminDownloadTab;
