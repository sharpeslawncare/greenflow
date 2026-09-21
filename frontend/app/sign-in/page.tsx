import { Suspense } from "react";

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#f5f8f5] px-5 py-10 md:px-7">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="border-l-4 border-[#176b37] pl-4">
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#176b37]">
              Sharpes Lawn Care
            </div>

            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
              GreenFlow
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in to access your lawn-care operations system.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Loading sign in...
              </div>
            }
          >
            <SignInForm />
          </Suspense>

          <p className="mt-6 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
            This is a private business system. Access is restricted to authorised users.
          </p>
        </section>
      </div>
    </main>
  );
}
