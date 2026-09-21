import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isSignedIn = Boolean(auth?.user);
      const isSignInPage = nextUrl.pathname === "/sign-in";

      if (isSignInPage) {
        if (isSignedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }

        return true;
      }

      return isSignedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
