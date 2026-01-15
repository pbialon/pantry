import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

interface DbUser {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Lazy import to avoid loading db in Edge Runtime (middleware)
        const { db } = await import("./db/client");

        const result = await db.execute({
          sql: "SELECT * FROM users WHERE email = ?",
          args: [email],
        });

        const user = result.rows[0] as unknown as DbUser | undefined;

        if (!user) {
          return null;
        }

        const passwordMatch = await compare(password, user.password_hash);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
