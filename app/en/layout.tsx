import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AddMemories – Digital wedding album and photo sharing",
  description: "Digital wedding album – guests can upload photos and greetings, newlyweds download memories. Fast and secure wedding photo sharing.",
};

interface EnLayoutProps {
  children: ReactNode;
}

export default function EnLayout({ children }: EnLayoutProps) {
  return children;
}
