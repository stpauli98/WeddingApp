import { NextRequest, NextResponse } from 'next/server';
import { sendNotificationToGuest, sendNotificationToEventGuests } from '@/lib/pushNotifications';
import { prisma } from '@/lib/prisma';

// API ruta za slanje notifikacija
export async function POST(request: NextRequest) {
  try {
    // Dohvati adminId iz URL parametra
    const url = new URL(request.url);
    const adminId: string | null = url.searchParams.get('adminId');
    
    if (!adminId) {
      return NextResponse.json(
        { error: 'Nedostaje adminId parametar' },
        { status: 400 }
      );
    }
    
    // Provjeri postoji li admin u bazi
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Administrator nije pronađen' },
        { status: 404 }
      );
    }
    
    // Dohvati podatke iz zahtjeva
    const data = await request.json();
    
    if (!data || !data.payload) {
      return NextResponse.json(
        { error: 'Nedostaju podaci za notifikaciju' },
        { status: 400 }
      );
    }
    
    // Pripremi payload za notifikaciju
    const payload = {
      title: data.title || 'Nova obavijest',
      body: data.body || 'Imate novu obavijest',
      icon: data.icon || '/apple-touch-icon.png',
      badge: data.badge || '/favicon.ico',
      data: data.data || {}
    };
    
    // Provjeri je li zahtjev za slanje jednom gostu ili svim gostima događaja
    if (data.guestId) {
      // Pošalji notifikaciju jednom gostu
      await sendNotificationToGuest(data.guestId, payload);
      
      return NextResponse.json(
        { success: true, message: 'Notifikacija poslana gostu' },
        { status: 200 }
      );
    } else if (data.eventId) {
      // Pošalji notifikaciju svim gostima događaja
      await sendNotificationToEventGuests(data.eventId, payload);
      
      return NextResponse.json(
        { success: true, message: 'Notifikacije poslane svim gostima događaja' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Potrebno je navesti guestId ili eventId' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Greška pri slanju notifikacija:', error);
    return NextResponse.json(
      { error: 'Greška pri slanju notifikacija' },
      { status: 500 }
    );
  }
}
