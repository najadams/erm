import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export const authOptions: NextAuthOptions = {
  // Require the secret to come from env; NextAuth will error if missing
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          return null;
        }

        if (!user.isActive) {
            throw new Error('User is deactivated');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          clearanceLevel: user.clearanceLevel,
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.departmentId = (user as any).departmentId;
        token.clearanceLevel = (user as any).clearanceLevel;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).departmentId = token.departmentId;
        (session.user as any).clearanceLevel = token.clearanceLevel;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  events: {
    async signIn({ user }) {
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'LOGIN',
                    userId: user.id,
                    actorRole: (user as any).role,
                    source: 'WEB',
                    newValue: 'User logged in'
                }
            });
        } catch (error) {
            console.error('Failed to log login event:', error);
        }
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
