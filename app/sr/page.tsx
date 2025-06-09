import { Inter } from "next/font/google";
import ClientPage from "@/components/ClientPage";

const inter = Inter({ subsets: ["latin"] });

export default function SrHomePage() {
  return (
    <main id="main-content" className={`min-h-screen bg-background ${inter.className}`}>
      <ClientPage />
    </main>
  );
}
