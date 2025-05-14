import React from "react";
import Image from "next/image";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveScrollPosition } from "@/lib/scrollPosition";

interface Guest {
  id: string;
  name: string;
  message?: string;
  coverImage?: string;
  uploadDate: string;
}

interface GuestCardProps {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    images: { imageUrl: string }[];
    message?: { text: string } | null;
    createdAt: string | Date;
  };
  onViewPhotos?: (guestId: string) => void;
}

// Adapter funkcija za konverziju starog formata gosta u novi
function adaptGuest(guest: GuestCardProps["guest"]): Guest {
  return {
    id: guest.id,
    name: `${guest.firstName} ${guest.lastName}`,
    message: guest.message?.text,
    coverImage: guest.images.length > 0 ? guest.images[0].imageUrl : undefined,
    uploadDate: new Date(guest.createdAt).toLocaleString('sr-latn', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
}

const GuestCard: React.FC<GuestCardProps> = ({ guest, onViewPhotos }) => {
  const adaptedGuest = adaptGuest(guest);
  
  const handleViewPhotos = () => {
    // Sačuvaj trenutnu poziciju skrola prije navigacije
    saveScrollPosition();
    
    if (onViewPhotos) {
      onViewPhotos(guest.id);
    } else {
      // Fallback na stari način navigacije ako nije proslijeđen onViewPhotos
      window.location.href = `/admin/dashboard/guest/${guest.id}`;
    }
  };

  return (
    <Card className="overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg">
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden">
        {adaptedGuest.coverImage ? (
          <Image
            src={adaptedGuest.coverImage}
            alt={`${adaptedGuest.name}'s photos`}
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-4xl font-bold text-primary">
            {guest.firstName?.[0] || ''}{guest.lastName?.[0] || ''}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-card p-5 flex flex-col h-[220px]">
        <div className="flex-grow">
          <h3 className="text-xl font-serif text-primary">{adaptedGuest.name}</h3>

          {/* Message */}
          <div className="mt-3 flex items-start gap-2">
            <MessageSquare className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
            {adaptedGuest.message ? (
              <p className="text-foreground line-clamp-3">{adaptedGuest.message}</p>
            ) : (
              <p className="text-muted-foreground italic line-clamp-3">Gost nije ostavio poruku</p>
            )}
          </div>
        </div>

        {/* Footer - fiksno na dnu */}
        <div className="mt-auto pt-3">
          {/* View All Button */}
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleViewPhotos}
          >
            Pregledaj sve slike ({guest.images.length})
          </Button>

          {/* Upload Date */}
          <p className="mt-2 text-sm text-muted-foreground text-center">Prijavljeno: {adaptedGuest.uploadDate}</p>
        </div>
      </div>
    </Card>
  );
};

export default GuestCard;
