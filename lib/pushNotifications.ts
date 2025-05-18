import webpush from 'web-push';
import { PushSubscription as WebPushSubscription } from 'web-push';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// VAPID ključevi - u produkciji bi trebali biti u .env fajlu
// Ovo su primjer ključevi, trebate generisati svoje vlastite
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = '3KzvKasA2SoCxsp0iIG_o9B0Ozvl1XDwI63JRKNIWBM';

// Postavi VAPID detalje
webpush.setVapidDetails(
  'mailto:info@mojasvadbaa.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Definicija tipa za pretplatu na notifikacije
type PushSubscriptionData = {
  id: string;
  guestId: string;
  subscription: string; // JSON string pretplate
  createdAt: string;
  updatedAt: string;
};

// Putanja do JSON datoteke za čuvanje pretplata
const SUBSCRIPTIONS_FILE_PATH = path.join(process.cwd(), 'data', 'push-subscriptions.json');

// Funkcija za čitanje pretplata iz JSON datoteke
function readSubscriptionsFromFile(): PushSubscriptionData[] {
  try {
    // Provjeri postoji li direktorij, ako ne - kreiraj ga
    const dirPath = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Provjeri postoji li datoteka, ako ne - kreiraj praznu
    if (!fs.existsSync(SUBSCRIPTIONS_FILE_PATH)) {
      fs.writeFileSync(SUBSCRIPTIONS_FILE_PATH, JSON.stringify([]), 'utf8');
      return [];
    }
    
    // Pročitaj i parsiraj JSON datoteku
    const fileContent = fs.readFileSync(SUBSCRIPTIONS_FILE_PATH, 'utf8');
    return JSON.parse(fileContent) as PushSubscriptionData[];
  } catch (error: unknown) {
    console.error('Greška pri čitanju pretplata iz datoteke:', error);
    return [];
  }
}

// Funkcija za pisanje pretplata u JSON datoteku
function writeSubscriptionsToFile(subscriptions: PushSubscriptionData[]): void {
  try {
    // Provjeri postoji li direktorij, ako ne - kreiraj ga
    const dirPath = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Zapiši pretplate u JSON datoteku
    fs.writeFileSync(SUBSCRIPTIONS_FILE_PATH, JSON.stringify(subscriptions, null, 2), 'utf8');
  } catch (error: unknown) {
    console.error('Greška pri pisanju pretplata u datoteku:', error);
  }
}

// Funkcija za spremanje pretplate na notifikacije
export async function saveSubscription(guestId: string, subscription: WebPushSubscription): Promise<PushSubscriptionData> {
  try {
    // Učitaj postojeće pretplate
    const subscriptions = readSubscriptionsFromFile();
    
    // Provjeri postoji li već pretplata za ovog gosta
    const existingIndex = subscriptions.findIndex(sub => sub.guestId === guestId);
    const now = new Date().toISOString();
    
    if (existingIndex !== -1) {
      // Ažuriraj postojeću pretplatu
      subscriptions[existingIndex].subscription = JSON.stringify(subscription);
      subscriptions[existingIndex].updatedAt = now;
      
      // Zapiši ažurirane pretplate
      writeSubscriptionsToFile(subscriptions);
      
      return subscriptions[existingIndex];
    } else {
      // Kreiraj novu pretplatu
      const newSubscription: PushSubscriptionData = {
        id: uuidv4(),
        guestId,
        subscription: JSON.stringify(subscription),
        createdAt: now,
        updatedAt: now
      };
      
      // Dodaj novu pretplatu i zapiši
      subscriptions.push(newSubscription);
      writeSubscriptionsToFile(subscriptions);
      
      return newSubscription;
    }
  } catch (error: unknown) {
    console.error('Greška pri spremanju pretplate:', error);
    throw error;
  }
}

// Funkcija za slanje notifikacije jednom gostu
export async function sendNotificationToGuest(guestId: string, payload: any): Promise<void> {
  try {
    // Učitaj pretplate
    const subscriptions = readSubscriptionsFromFile();
    
    // Pronađi pretplatu za gosta
    const subscriptionRecord = subscriptions.find(sub => sub.guestId === guestId);

    if (!subscriptionRecord) {
      console.log(`Nema pretplate za gosta ${guestId}`);
      return;
    }

    const subscription = JSON.parse(subscriptionRecord.subscription) as WebPushSubscription;
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log(`Notifikacija poslana gostu ${guestId}`);
  } catch (error: unknown) {
    console.error(`Greška pri slanju notifikacije gostu ${guestId}:`, error);
    
    // Ako je pretplata nevažeća, izbriši je
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
      // Učitaj pretplate
      const subscriptions = readSubscriptionsFromFile();
      
      // Filtriraj nevažeću pretplatu
      const updatedSubscriptions = subscriptions.filter(sub => sub.guestId !== guestId);
      
      // Zapiši ažurirane pretplate
      writeSubscriptionsToFile(updatedSubscriptions);
    }
  }
}

// Funkcija za slanje notifikacije svim gostima za određeni događaj
export async function sendNotificationToEventGuests(eventId: string, payload: any): Promise<void> {
  try {
    // Uvozimo prisma klijent samo ovdje jer nam treba za dohvaćanje gostiju
    const { prisma } = await import('./prisma');
    
    // Dohvati sve goste za događaj
    const guests = await prisma.guest.findMany({
      where: { eventId },
      select: { id: true }
    });
    
    // Učitaj sve pretplate
    const allSubscriptions = readSubscriptionsFromFile();
    
    // Filtriraj pretplate koje pripadaju gostima ovog događaja
    const guestIds = guests.map(guest => guest.id);
    const eventSubscriptions = allSubscriptions.filter(sub => guestIds.includes(sub.guestId));
    
    // Pošalji notifikacije svim pretplaćenim gostima
    const invalidSubscriptionIds: string[] = [];
    
    const sendPromises = eventSubscriptions.map((sub) => {
      const subscription = JSON.parse(sub.subscription) as WebPushSubscription;
      return webpush.sendNotification(subscription, JSON.stringify(payload))
        .catch((error: unknown) => {
          console.error(`Greška pri slanju notifikacije za pretplatu ${sub.id}:`, error);
          
          // Ako je pretplata nevažeća, označi je za brisanje
          if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 410) {
            invalidSubscriptionIds.push(sub.id);
          }
        });
    });

    await Promise.all(sendPromises);
    
    // Izbriši nevažeće pretplate
    if (invalidSubscriptionIds.length > 0) {
      const validSubscriptions = allSubscriptions.filter(sub => !invalidSubscriptionIds.includes(sub.id));
      writeSubscriptionsToFile(validSubscriptions);
    }
    
    console.log(`Notifikacije poslane za ${sendPromises.length} gostiju događaja ${eventId}`);
  } catch (error: unknown) {
    console.error('Greška pri slanju grupne notifikacije:', error);
    throw error;
  }
}

// Funkcija za dohvaćanje VAPID javnog ključa
export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}
