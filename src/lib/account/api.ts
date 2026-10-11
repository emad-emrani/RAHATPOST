import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

/**
 * Deletes the signed-in user's account and everything they posted: ads, reader news and business
 * submissions (approved directory entries included), push subscriptions, sessions and linked
 * Google/Facebook accounts. Uploaded photos (Blob files + media_uploads rows) are deleted first. Reports they filed stay,
 * without their user id.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { confirm: string }) => ({ confirm: String(input?.confirm ?? "") }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    if (data.confirm !== "حذف") return { ok: false, message: "اكتب كلمة «حذف» للتأكيد." };
    const userId = context.user.id;
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      // Photos first: their rows would cascade with the user, but the Blob files would stay.
      const { deleteAllMediaOfUser, deleteOwnerMedia } = await import("@/lib/media/store.server");
      const owned = await sql<{ kind: "ad" | "business"; id: string }>`
        select 'ad' as kind, id from classifieds where user_id = ${userId}
        union all select 'business' as kind, id from business_submissions where user_id = ${userId}`;
      for (const o of owned) await deleteOwnerMedia(o.kind, o.id);
      await deleteAllMediaOfUser(userId);
      // business_submissions.user_id is "on delete set null", so remove those rows explicitly;
      // the rest cascade from "user" (sessions, accounts, classifieds, reader_news, push).
      await sql`delete from business_submissions where user_id = ${userId}`;
      await sql`delete from classifieds where user_id = ${userId}`;
      await sql`delete from reader_news where user_id = ${userId}`;
      await sql`delete from push_subscriptions where user_id = ${userId}`;
      await sql`delete from "user" where "id" = ${userId}`;
      const { setCookie } = await import("@tanstack/react-start/server");
      for (const name of ["better-auth.session_token", "__Secure-better-auth.session_token"]) {
        setCookie(name, "", {
          path: "/",
          maxAge: 0,
          secure: name.startsWith("__Secure"),
          httpOnly: true,
          sameSite: "lax",
        });
      }
      return { ok: true };
    } catch (error) {
      console.error("[account] delete failed", error);
      return { ok: false, message: "تعذّر حذف الحساب الآن. حاول مرة أخرى أو راسلنا." };
    }
  });
