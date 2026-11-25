import { createServerFn } from "@tanstack/react-start";

export type ListingBlockRow = {
  blockerId: string;
  blockerName: string;
  blockedId: string;
  blockedName: string;
  createdAt: string;
};

const ID = /^[A-Za-z0-9_-]{6,64}$/;

/** Owner view of personal «hide this seller» blocks from the classifieds. */
export const adminListBlocks = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; items: ListingBlockRow[] }> => {
    const { isOwner } = await import("@/lib/admin-auth");
    if (!(await isOwner())) return { authed: false, items: [] };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql.query<{
      blocker_id: string;
      blocker_name: string | null;
      blocked_id: string;
      blocked_name: string | null;
      created_at: string;
    }>(
      `select b.blocker_id, ub.name as blocker_name, b.blocked_id, us.name as blocked_name, b.created_at
         from user_listing_blocks b
         join "user" ub on ub.id = b.blocker_id
         join "user" us on us.id = b.blocked_id
        order by b.created_at desc
        limit 200`,
    );
    return {
      authed: true,
      items: rows.map((r) => ({
        blockerId: r.blocker_id,
        blockerName: r.blocker_name?.trim() || "عضو",
        blockedId: r.blocked_id,
        blockedName: r.blocked_name?.trim() || "عضو",
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  },
);

export const adminRemoveBlock = createServerFn({ method: "POST" })
  .inputValidator((input: { blockerId?: string; blockedId?: string }) => {
    const blockerId = String(input?.blockerId ?? "");
    const blockedId = String(input?.blockedId ?? "");
    if (!ID.test(blockerId) || !ID.test(blockedId)) throw new Error("bad block");
    return { blockerId, blockedId };
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { isOwner } = await import("@/lib/admin-auth");
    if (!(await isOwner())) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql.query(`delete from user_listing_blocks where blocker_id = $1 and blocked_id = $2`, [
      data.blockerId,
      data.blockedId,
    ]);
    return { ok: true };
  });
