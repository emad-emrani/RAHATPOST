import { authClient } from "./client";

export type AppUser = {
  id: string;
  displayName: string;
  email: string | null;
  image: string | null;
};

/** `user` is null while loading (isPending) and when signed out. */
export function useCurrentUserState(): { user: AppUser | null; isPending: boolean } {
  const { data, isPending } = authClient.useSession();
  const u = data?.user;
  return {
    user: u
      ? {
          id: u.id,
          displayName: u.name || u.email || "مستخدم",
          email: u.email ?? null,
          image: u.image ?? null,
        }
      : null,
    isPending,
  };
}
