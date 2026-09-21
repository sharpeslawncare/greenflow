"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import {
  authenticate,
  type SignInState,
} from "./actions";

const initialState: SignInState = {
  error: "",
};

export function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") || "/";

  const [state, formAction, pending] =
    useActionState(
      authenticate,
      initialState,
    );

  return (
    <form
      action={formAction}
      className="mt-7 space-y-5"
    >
      <input
        type="hidden"
        name="redirectTo"
        value={callbackUrl}
      />

      <label className="block">
        <span className="gf-label mb-1.5 block">
          Email address
        </span>

        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#176b37] focus:ring-4 focus:ring-green-100"
        />
      </label>

      <label className="block">
        <span className="gf-label mb-1.5 block">
          Password
        </span>

        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={12}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#176b37] focus:ring-4 focus:ring-green-100"
        />
      </label>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="min-h-6"
      >
        {state.error && (
          <p className="text-sm font-semibold text-red-700">
            {state.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="gf-button w-full bg-[#176b37] text-white transition hover:bg-[#125b2f] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {pending
          ? "Signing in..."
          : "Sign in to GreenFlow"}
      </button>
    </form>
  );
}
