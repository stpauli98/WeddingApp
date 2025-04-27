// Tip za detalje gosta, koristi se u admin i guest delovima aplikacije
export interface GuestDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  message?: {
    text?: string;
  };
  images: {
    id: string;
    imageUrl: string;
  }[];
}
