import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({
    id: admin.id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    language: admin.language,
    event: admin.event,
  });
}
