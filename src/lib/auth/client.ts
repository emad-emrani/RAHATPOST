import { createAuthClient } from "better-auth/react";
import { isNativeApp, nativeSignIn } from "./native";

/** Browser-side Better Auth client for this site's own `/api/auth/*`. */
export const authClient = createAuthClient();

export type SocialProvider = "google" | "facebook";

/** Full-page redirect to Google / Facebook, returning to `callbackURL` afterwards. */
export async function signInWith(provider: SocialProvider, callbackURL = "/"): Promise<void> {
  // Store app: Google blocks OAuth in WebViews — sign in through the system browser instead.
  if (isNativeApp()) return nativeSignIn(provider, callbackURL);
  const { data, error } = await authClient.signIn.social({
    provider,
    callbackURL,
    errorCallbackURL: `/login?error=1&redirect=${encodeURIComponent(callbackURL)}`,
  });
  if (error) throw new Error(error.message ?? "Sign-in failed");
  if (data?.url) window.location.href = data.url;
}

export async function signOut(redirectTo = "/"): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Sign-out failed");
  window.location.href = redirectTo;
}
