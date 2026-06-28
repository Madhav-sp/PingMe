import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { generateUsername } from "@/lib/utils";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          displayName: profile.name ?? profile.email.split("@")[0],
          image: profile.picture,
          username: generateUsername(profile.email),
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              displayName: user.name ?? user.email!.split("@")[0],
              username: generateUsername(user.email!),
              image: user.image,
              emailVerified: new Date(),
              isOnline: true,
              lastSeen: new Date(),
            },
          });
        } else {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { isOnline: true, lastSeen: new Date() },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.username = dbUser.username;
          token.displayName = dbUser.displayName;
          token.image = dbUser.image;
        }
      }
      if (trigger === "update" && session) {
        token.username = session.username ?? token.username;
        token.displayName = session.displayName ?? token.displayName;
        token.image = session.image ?? token.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        (session.user as unknown as Record<string, unknown>).username = token.username;
        (session.user as unknown as Record<string, unknown>).displayName = token.displayName;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.userId) {
        await prisma.user.update({
          where: { id: message.token.userId as string },
          data: { isOnline: false, lastSeen: new Date() },
        }).catch(() => {});
      }
    },
  },
});
