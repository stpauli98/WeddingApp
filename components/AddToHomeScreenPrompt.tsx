"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";

const isiOS = () => {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
};

const isAndroid = () => {
  if (typeof window === "undefined") return false;
  return /android/.test(window.navigator.userAgent.toLowerCase());
};

export default function AddToHomeScreenPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (localStorage.getItem("a2hsPromptDismissed")) return;
    setShow(true);

    let promptHandler: any = null;
    if (isAndroid()) {
      window.addEventListener("beforeinstallprompt", (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      });
    } else if (isiOS()) {
      setShow(true);
    }
    return () => {
      if (promptHandler) window.removeEventListener("beforeinstallprompt", promptHandler);
    };
  }, []);

  if (!show) return null;

  const handleAdd = () => {
    if (isAndroid() && deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setShow(false);
        localStorage.setItem("a2hsPromptDismissed", "true");
      });
    } else {
      setShow(false);
      localStorage.setItem("a2hsPromptDismissed", "true");
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Ne upisuj ništa u localStorage, prompt će se prikazivati na svakom reloadu
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center animate-fade-in space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Brži pristup uspomenama
        </h2>
        <p className="text-sm text-gray-700">
          Dodajte <b>DodajUspomenu</b> na početni ekran – kao pravu aplikaciju.
          Otvorite je jednim dodirom i sačuvajte sve uspomene <b>bez traženja</b> <b>linka</b> ili <b>QR koda</b>.
        </p>

        <div className="text-sm text-gray-600 text-left space-y-2">
          {isAndroid() && (
            <div className="flex items-center gap-2">
              <Image src="/android-home.svg" alt="Ikona" width={24} height={24} />
              <span>U meniju (⋮) izaberite <b>„Dodaj na početni ekran”</b></span>
            </div>
          )}
          {isiOS() && (
            <>
              <div className="flex items-center gap-2">
                <Image src="/ios-share.svg" alt="Share" width={20} height={20} />
                <span>Otvorite <b>Share</b> meni</span>
              </div>
              <div className="flex items-center gap-2">
                <Image src="/add-to-queue.svg" alt="Add" width={20} height={20} />
                <span>Izaberite <b>„Add to Home Screen”</b></span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <button
            className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition"
            onClick={handleAdd}
          >
            OK
          </button>
          <button
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
            onClick={handleDismiss}
          >
            Kasnije
          </button>
        </div>
      </div>
    </div>
  );
}
