import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Dodaj u .env.local:
// GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
// GOOGLE_CLIENT_SECRET=yyy

const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@email.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Morate uneti email i lozinku.");
        }
        // Pronađi korisnika po emailu
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.email) {
          throw new Error("Ne postoji korisnik sa tom email adresom.");
        }
        // Proveri hash lozinke
        if (!user.passwordHash) {
          throw new Error("Korisnik nema postavljenu lozinku. Prijavite se Google nalogom.");
        }
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Pogrešna lozinka.");
        }
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt" as import("next-auth").SessionStrategy,
  },
  pages: {
    signIn: "/admin/event", // možeš promeniti na /admin/login ili custom
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      // Automatski postavi rolu na 'admin' za poznate admin emailove
      const adminEmails = ["admin@email.com"]; // <-- OVDE unesi sve admin emailove
      if (user && adminEmails.includes(user.email) && user.role !== "admin") {
        await prisma.user.update({
          where: { email: user.email },
          data: { role: "admin" }
        });
      }
      return true;
    },
    async jwt({ token, user }: { token: any; user?: any }) {
      // Uvek dodeli role iz baze
      const email = user?.email || token.email;
      if (email) {
        const dbUser = await prisma.user.findUnique({ where: { email } });
        token.id = dbUser?.id || token.id;
        token.role = dbUser?.role || "guest";
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      // Dodaj id i role u session.user
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export { authOptions };

