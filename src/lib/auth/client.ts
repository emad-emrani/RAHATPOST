import { createAuthClient } from "better-auth/react";
import { isIosNativeApp, isNativeApp, nativeAppleSignIn, nativeSignIn } from "./native";

/** Browser-side Better Auth client for this site's own `/api/auth/*`. */
export const authClient = createAuthClient();

export type SocialProvider = "google" | "facebook" | "apple";

/** Full-page redirect to Google / Facebook / Apple, returning to `callbackURL` afterwards. */
export async function signInWith(provider: SocialProvider, callbackURL = "/"): Promise<void> {
  // Apple's web form_post flow fails inside WKWebView (state cookie is not sent, and Apple
  // rejects embedded browsers). Use the native sheet when the binary has it, otherwise the
  // system browser hand-back that Google already uses.
  if (isIosNativeApp() && provider === "apple") {
    try {
      const native = await nativeAppleSignIn();
      if (!native) return nativeSignIn("apple", callbackURL);
      const { error } = await authClient.signIn.social({
        provider: "apple",
        callbackURL,
        idToken: {
          token: native.identityToken,
          nonce: native.nonce,
          ...(native.email || native.givenName || native.familyName
            ? {
                user: {
                  email: native.email,
                  name: { firstName: native.givenName, lastName: native.familyName },
                },
              }
            : {}),
        },
      });
      if (error) throw new Error(error.message ?? "Sign-in failed");
      window.location.href = callbackURL;
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AppleSignInCancelled") return;
      throw error;
    }
  }
  // Google and Facebook block embedded WebViews.
  if (isNativeApp() && provider !== "apple") return nativeSignIn(provider, callbackURL);
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
