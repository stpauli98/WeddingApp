import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { generateCsrfToken, validateCsrfToken } from '@/lib/csrf';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';
import { getAuthenticatedGuest } from '@/lib/guest-auth';

// Definicija tipa za feedback
interface FeedbackData {
  id: string;
  comment: string;
  email: string | null;
  createdAt: string;
  submittedBy: string; // "admin:<id>" or "guest:<id>"
}

// Putanja do JSON fajla za čuvanje komentara
const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json');

// ─── Rate limiting (in-memory, per-IP) ──────────────────────────────
declare global {
  var __feedbackAttempts: Map<string, number[]> | undefined;
}
const feedbackAttempts: Map<string, number[]> = globalThis.__feedbackAttempts || new Map();
globalThis.__feedbackAttempts = feedbackAttempts;
const FEEDBACK_MAX = 3;
const FEEDBACK_WINDOW_MS = 15 * 60 * 1000; // 15 min

// ─── Field limits ──────────────────────────────────────────────────
const MAX_COMMENT_LEN = 2000;
const MAX_EMAIL_LEN = 100;

// Funkcija za čitanje postojećih komentara
function readFeedback(): FeedbackData[] {
  try {
    const dir = path.dirname(FEEDBACK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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

// GET — izdaje CSRF token klijentu (isti pattern kao ostali POST endpoint-i)
export async function GET() {
  const { token, cookie } = await generateCsrfToken();
  const response = NextResponse.json({ csrfToken: token });
  response.headers.set('set-cookie', cookie);
  return response;
}

export async function POST(request: NextRequest) {
  // 1. CSRF validacija
  const csrfToken = request.headers.get('x-csrf-token') || request.cookies.get('csrf_token')?.value || '';
  const validCsrf = await validateCsrfToken(csrfToken);
  if (!validCsrf) {
    return NextResponse.json({ error: 'Nevažeći CSRF token.' }, { status: 403 });
  }

  // 2. Auth — samo prijavljeni admin ili gost može slati feedback
  const admin = await getAuthenticatedAdmin();
  const guest = admin ? null : await getAuthenticatedGuest();
  if (!admin && !guest) {
    return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
  }
  const submittedBy = admin ? `admin:${admin.id}` : `guest:${guest!.id}`;

  // 3. Rate limiting po IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (feedbackAttempts.get(ip) || []).filter(ts => now - ts < FEEDBACK_WINDOW_MS);
  if (recent.length >= FEEDBACK_MAX) {
    return NextResponse.json({ error: 'Previše zahteva. Pokušajte ponovo kasnije.' }, { status: 429 });
  }
  feedbackAttempts.set(ip, [...recent, now]);

  try {
    const body = await request.json();
    const commentRaw = typeof body?.comment === 'string' ? body.comment : '';
    const emailRaw = typeof body?.email === 'string' ? body.email : '';

    const comment = commentRaw.trim();
    const email = emailRaw.trim();

    if (!comment) {
      return NextResponse.json({ error: 'Komentar je obavezan' }, { status: 400 });
    }
    if (comment.length > MAX_COMMENT_LEN) {
      return NextResponse.json({ error: `Komentar je predugačak (max ${MAX_COMMENT_LEN} znakova).` }, { status: 400 });
    }
    if (email && (email.length > MAX_EMAIL_LEN || !/^\S+@\S+\.\S+$/.test(email))) {
      return NextResponse.json({ error: 'Neispravan format email adrese.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const newFeedback: FeedbackData = {
      id,
      comment,
      email: email || null,
      createdAt: new Date().toISOString(),
      submittedBy,
    };

    const feedbacks = readFeedback();
    feedbacks.push(newFeedback);
    writeFeedback(feedbacks);

    return NextResponse.json({ message: 'Komentar uspješno sačuvan', id }, { status: 201 });
  } catch (error) {
    console.error('Greška prilikom čuvanja komentara:', error);
    return NextResponse.json({ error: 'Došlo je do greške prilikom čuvanja komentara' }, { status: 500 });
  }
}
