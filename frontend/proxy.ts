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

export default auth(
  function proxy(
    request: NextRequest,
  ) {
    const isDeveloperToolsRoute =
      request.nextUrl.pathname ===
        "/settings/developer" ||
      request.nextUrl.pathname.startsWith(
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