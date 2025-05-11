import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

// Definicija tipa za feedback
interface FeedbackData {
  id: string;
  comment: string;
  email: string | null;
  createdAt: string;
}

// Putanja do JSON fajla za čuvanje komentara
const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json');

// Funkcija za čitanje postojećih komentara
function readFeedback(): FeedbackData[] {
  try {
    // Provjeri da li direktorij postoji, ako ne, kreiraj ga
    const dir = path.dirname(FEEDBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Provjeri da li fajl postoji, ako ne, kreiraj prazan
    if (!fs.existsSync(FEEDBACK_FILE)) {
      fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([]), 'utf8');
      return [];
    }
    
    const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Greška prilikom čitanja feedback fajla:', error);
    return [];
  }
}

// Funkcija za zapisivanje komentara
function writeFeedback(feedbacks: FeedbackData[]): void {
  try {
    const dir = path.dirname(FEEDBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf8');
  } catch (error) {
    console.error('Greška prilikom zapisivanja feedback fajla:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { comment, email } = await request.json();

    if (!comment || comment.trim() === "") {
      return NextResponse.json(
        { error: "Komentar je obavezan" },
        { status: 400 }
      );
    }

    // Generiraj jedinstveni ID
    const id = crypto.randomUUID();
    
    // Kreiraj novi feedback
    const newFeedback: FeedbackData = {
      id,
      comment,
      email: email || null,
      createdAt: new Date().toISOString()
    };
    
    // Dodaj u postojeće komentare
    const feedbacks = readFeedback();
    feedbacks.push(newFeedback);
    writeFeedback(feedbacks);

    console.log(`Novi komentar sačuvan: ${id}`);

    return NextResponse.json(
      { message: "Komentar uspješno sačuvan", id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Greška prilikom čuvanja komentara:", error);
    
    return NextResponse.json(
      { error: "Došlo je do greške prilikom čuvanja komentara" },
      { status: 500 }
    );
  }
}
