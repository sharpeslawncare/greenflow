import NextAuth from "next-auth";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

import { authConfig } from "@/auth.config";
import {
  greenFlowEnvironment,
} from "@/lib/greenflow-environment";

const { auth } = NextAuth(authConfig);

type AuthenticatedRequest = NextRequest & {
  auth: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      role?: string;
    };
  } | null;
};

export default auth(
  function proxy(
    request: AuthenticatedRequest,
  ) {
    const pathname =
      request.nextUrl.pathname;

    const isSignInPage =
      pathname === "/sign-in";

    const isSignedIn =
      Boolean(request.auth?.user);

    /*
     * Authentication is enforced explicitly here because
     * GreenFlow uses a custom Auth.js proxy callback for
     * additional production route protection.
     */
    if (!isSignedIn && !isSignInPage) {
      const signInUrl =
        new URL(
          "/sign-in",
          request.url,
        );

      return NextResponse.redirect(
        signInUrl,
      );
    }

    if (isSignedIn && isSignInPage) {
      const homeUrl =
        new URL(
          "/",
          request.url,
        );

      return NextResponse.redirect(
        homeUrl,
      );
    }

    const isDeveloperToolsRoute =
      pathname ===
        "/settings/developer" ||
      pathname.startsWith(
        "/settings/developer/",
      );

    if (
      greenFlowEnvironment ===
        "production" &&
      isDeveloperToolsRoute
    ) {
      const settingsUrl =
        new URL(
          "/settings",
          request.url,
        );

      return NextResponse.redirect(
        settingsUrl,
      );
    }

    return NextResponse.next();
  },
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};