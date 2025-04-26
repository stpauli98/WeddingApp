
import { redirect } from "next/navigation"
import { getGuestById } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ClientSuccess from "./client-success"
import { cookies } from "next/headers";
import { useEffect, useState } from "react"

function getSlikaPadez(n: number) {
  switch (n) {
    case 1:
      return "sliku"
    case 2:
    case 3:
    case 4:
      return "slike"
    default:
      return "slika"
  }
}

interface Image {
  id: string
  imageUrl: string
  storagePath?: string | null
}


export default async function SuccessPage() {
  // Dohvati guestId iz session cookie-ja
  const cookieStore = await cookies();
  const guestId = cookieStore.get("guest_session")?.value || "";

  if (!guestId) {
    redirect("/");
  }

  // Dohvatanje gosta sa slikama
  const guest = await getGuestById(guestId);

  if (!guest) {
    redirect("/");
  }

  // Posebno dohvatanje poruke za gosta
  const message = await prisma.message.findUnique({
    where: { guestId: guestId }
  });

  // Dohvatanje imena brudova iz baze
  const event = await prisma.event.findFirst({
    where: { id: guest?.eventId },
    select: { coupleName: true }
  });

  return <ClientSuccess guest={guest} coupleName={event?.coupleName} message={message} />;
}
