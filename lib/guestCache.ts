// Jednostavan memorijski keš za detalje gostiju (važi dok traje sesija u browseru)
import type { GuestDetail } from "@/components/ui/types";

const guestCache: { [id: string]: GuestDetail } = {};

export function getGuestFromCache(id: string): GuestDetail | undefined {
  return guestCache[id];
}

export function setGuestInCache(id: string, guest: GuestDetail) {
  guestCache[id] = guest;
}
