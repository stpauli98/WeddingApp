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
  const [notificationPermission, setNotificationPermission] = useState<string>("");

  useEffect(() => {
    if (localStorage.getItem("a2hsPromptDismissed")) return;
    setShow(true);

    // Provjeri trenutni status dozvole za notifikacije
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

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
        // Nakon dodavanja na početni ekran, pitaj za notifikacije
        requestNotificationPermission();
      });
    } else {
      setShow(false);
      localStorage.setItem("a2hsPromptDismissed", "true");
      // Nakon dodavanja na početni ekran, pitaj za notifikacije
      requestNotificationPermission();
    }
  };

  // Funkcija za traženje dozvole za notifikacije
  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === "granted") {
          // Registruj service worker za notifikacije ako već nije
          registerPushNotifications();
        }
      } catch (error) {
        console.error("Greška pri traženju dozvole za notifikacije:", error);
      }
    }
  };

  // Funkcija za registraciju service workera za push notifikacije
  const registerPushNotifications = async () => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        // Registriraj notification service worker ako već nije registriran
        await navigator.serviceWorker.register('/notification-sw.js');
        
        // Sačekaj da service worker bude spreman
        const registration = await navigator.serviceWorker.ready;
        
        try {
          // Dohvati VAPID javni ključ sa servera
          const vapidResponse = await fetch('/api/guest/notifications/subscribe');
          const { vapidPublicKey } = await vapidResponse.json();
          
          // Pretplati se na push notifikacije
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
          
          // Pošalji pretplatu na server
          const response = await fetch('/api/guest/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription)
          });
          
          if (response.ok) {
            console.log("Push notifikacije uspješno registrovane");
            
            // Prikaži test notifikaciju nakon uspješne pretplate
            showTestNotification();
          } else {
            console.error("Greška pri slanju pretplate na server");
          }
          
        } catch (subscribeError) {
          console.error("Neuspješna pretplata na push notifikacije:", subscribeError);
        }
      } catch (error) {
        console.error("Greška pri registraciji service workera:", error);
      }
    }
  };
  
  // Pomoćna funkcija za konverziju base64 u Uint8Array (potrebno za VAPID ključ)
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };
  
  // Funkcija za prikazivanje test notifikacije
  const showTestNotification = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification("DodajUspomenu", {
          body: "Hvala što ste omogućili notifikacije! Obavijestićemo vas o novim uspomenama.",
          icon: "/apple-touch-icon.png",
          badge: "/favicon.ico"
        });
      });
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
        
        {notificationPermission === "default" && (
          <div className="mt-3 text-xs text-gray-500">
            <p>Dozvolite notifikacije da biste primali obavještenja o novim uspomenama.</p>
          </div>
        )}
      </div>
    </div>
  );
}
