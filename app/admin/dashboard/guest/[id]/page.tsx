export const dynamic = "force-dynamic";
export const dynamicParams = true;

import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'

export default async function GuestDetailPage(props: any) {
  const { params } = await Promise.resolve(props);
  if (!params?.id || typeof params.id !== "string") {
    return <div className="container mx-auto p-8">Neispravan ID gosta.</div>;
  }
  const guest = await prisma.guest.findUnique({
    where: { id: params.id },
    include: { images: true, message: true, event: true },
  });

  if (!guest) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Gost nije pronađen</h1>
        <Link href="/admin/dashboard" className="text-blue-600 underline">Nazad na dashboard</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Detalji gosta: {guest.firstName} {guest.lastName}</h1>
      <div className="mb-4 text-gray-600 text-sm">
        Email: {guest.email} <br />
        Prijavljen: {new Date(guest.createdAt).toLocaleString('sr-RS', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="mb-6">
        <span className="font-semibold">Poruka:</span><br />
        <span className="italic">{guest.message?.text || 'Nema poruke.'}</span>
      </div>
      <div>
        <span className="font-semibold">Slike gosta ({guest.images.length}):</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {guest.images.length > 0
            ? guest.images.map(img => (
                <div key={img.id} className="relative aspect-square w-full h-40 border rounded overflow-hidden">
                  <Image src={img.imageUrl} alt="Slika gosta" fill className="object-cover" />
                </div>
              ))
            : <span className="text-gray-400 italic">Nema slika.</span>
          }
        </div>
      </div>
      <div className="mt-8">
        <Link href="/admin/dashboard" className="text-blue-600 underline">Nazad na dashboard</Link>
      </div>
    </div>
  )
}
