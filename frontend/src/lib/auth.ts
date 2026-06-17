import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// 1. Extend NextAuth types to include our custom FastAPI JWT access token
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      name?: string | null;
    };
  }
  interface User {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

// 2. Configure NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch("http://127.0.0.1:8000/api/admin/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          // GUARDRAIL: Check if the server crashed BEFORE trying to parse JSON
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`FastAPI Error (${res.status}):`, errorText);
            return null; // Triggers the "Invalid credentials" error on the frontend safely
          }

          const data = await res.json();

          if (data.access_token) {
            return {
              id: credentials.username, 
              name: credentials.username,
              accessToken: data.access_token, 
            };
          }

          return null;
        } catch (error) {
          console.error("Network or parsing error:", error);
          return null;
        }
      },

    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, attach the FastAPI token to the NextAuth JWT
      if (user) {
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      // Make the FastAPI token available to your React components (useSession)
      session.accessToken = token.accessToken;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60, // 2 hours (Matches your FastAPI token expiration)
  },
  pages: {
    signIn: "/auth/v1/login", // Redirects here if auth fails or is required
  },
};

// 3. Export the handler for your route.ts
export const handler = NextAuth(authOptions);
