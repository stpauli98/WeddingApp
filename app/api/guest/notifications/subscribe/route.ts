import { NextRequest, NextResponse } from 'next/server';
import { saveSubscription, getVapidPublicKey } from '@/lib/pushNotifications';
import { getGuestById } from '@/lib/auth';

// API ruta za pretplatu na notifikacije
export async function POST(request: NextRequest) {
  try {
    // Dohvati gostId iz URL parametra
    const url = new URL(request.url);
    const guestId: string | null = url.searchParams.get('guestId');
    
    if (!guestId) {
      return NextResponse.json(
        { error: 'Nedostaje guestId parametar' },
        { status: 400 }
      );
    }
    
    // Dohvati gosta iz baze
    const guest = await getGuestById(guestId);
    
    if (!guest) {
      return NextResponse.json(
        { error: 'Gost nije pronađen ili nije verifikovan' },
        { status: 404 }
      );
    }
    
    // Dohvati podatke o pretplati iz zahtjeva
    const subscription = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Nevažeća pretplata' },
        { status: 400 }
      );
    }
    
    // Spremi pretplatu
    await saveSubscription(guest.id, subscription);
    
    return NextResponse.json(
      { success: true, message: 'Pretplata uspješno spremljena' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Greška pri pretplati na notifikacije:', error);
    return NextResponse.json(
      { error: 'Greška pri pretplati na notifikacije' },
      { status: 500 }
    );
  }
}

// API ruta za dohvaćanje VAPID javnog ključa
export async function GET() {
  try {
    const vapidPublicKey = getVapidPublicKey();
    
    return NextResponse.json(
      { vapidPublicKey },
      { status: 200 }
    );
  } catch (error) {
    console.error('Greška pri dohvaćanju VAPID ključa:', error);
    return NextResponse.json(
      { error: 'Greška pri dohvaćanju VAPID ključa' },
      { status: 500 }
    );
  }
}
