"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() =>
        signOut({
          callbackUrl: "/sign-in",
        })
      }
      className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-left text-xs font-bold text-white transition hover:bg-white/15"
    >
      Sign out
    </button>
  );
}
