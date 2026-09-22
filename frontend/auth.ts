import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";

const OWNER_NAME = "Rob Sharpe";
const OWNER_ROLE = "Owner";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  providers: [
    Credentials({
      name: "GreenFlow owner account",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const configuredEmail = process.env.GREENFLOW_OWNER_EMAIL
          ?.trim()
          .toLowerCase();

        const configuredPasswordHash =
          process.env.GREENFLOW_OWNER_PASSWORD_HASH?.trim();

        if (!configuredEmail || !configuredPasswordHash) {
          console.error(
            "GreenFlow owner credentials are not configured.",
          );
          return null;
        }

        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password || email !== configuredEmail) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          configuredPasswordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: "greenflow-owner",
          name: OWNER_NAME,
          email: configuredEmail,
          role: OWNER_ROLE,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    jwt({ token, user }) {
      if (user) {
        token.role = "Owner";
      }

      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id =
          token.sub ?? "greenflow-owner";

        session.user.role =
          typeof token.role === "string"
            ? token.role
            : OWNER_ROLE;
      }

      return session;
    },
  },
});