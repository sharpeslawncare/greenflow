"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export type SignInState = {
  error: string;
};

export async function authenticate(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  try {
    await signIn("credentials", formData);

    return {
      error: "",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          error:
            "The email address or password is incorrect.",
        };
      }

      return {
        error:
          "GreenFlow could not sign you in. Please try again.",
      };
    }

    throw error;
  }
}