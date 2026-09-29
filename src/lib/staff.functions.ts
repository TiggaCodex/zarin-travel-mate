import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_admin");
  if (error || data !== true) throw new Error("Only administrators can manage staff accounts.");
}

const BAN_FOREVER = "876000h";

export type StaffMember = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: "admin" | "staff";
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  invited_pending: boolean;
};

async function loadStaff(ctx: Ctx): Promise<StaffMember[]> {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    ctx.supabase.from("profiles").select("id, full_name, phone, is_active, created_at"),
    ctx.supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pErr) throw new Error(pErr.message);
  if (rErr) throw new Error(rErr.message);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authData, error: aErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (aErr) throw new Error("Could not load account details.");
  const authById = new Map(authData.users.map((u) => [u.id, u]));
  return (profiles ?? [])
    .map((p: any) => {
      const u = authById.get(p.id);
      const isAdmin = (roles ?? []).some((r: any) => r.user_id === p.id && r.role === "admin");
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        email: u?.email ?? null,
        role: isAdmin ? "admin" : "staff",
        is_active: p.is_active,
        created_at: p.created_at,
        last_sign_in_at: u?.last_sign_in_at ?? null,
        invited_pending: Boolean(u && !u.last_sign_in_at && !u.email_confirmed_at),
      } as StaffMember;
    })
    .sort((a: StaffMember, b: StaffMember) => a.full_name.localeCompare(b.full_name));
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    return loadStaff(context as Ctx);
  });

export const getStaffMember = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const all = await loadStaff(ctx);
    const member = all.find((m) => m.id === data.id);
    if (!member) throw new Error("Account not found.");
    const count = (table: string, col: string, extra?: (q: any) => any) => {
      let q = ctx.supabase.from(table).select("id", { count: "exact", head: true }).eq(col, data.id);
      if (extra) q = extra(q);
      return q;
    };
    const [b, p, r] = await Promise.all([
      count("transactions", "created_by"),
      count("payments", "recorded_by"),
      count("reminders", "sent_by", (q) => q.eq("status", "sent")),
    ]);
    return {
      member,
      activity: { bookings: b.count ?? 0, payments: p.count ?? 0, remindersSent: r.count ?? 0 },
    };
  });

const createSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(["admin", "staff"]),
  is_active: z.boolean(),
  redirect_to: z.string().url(),
});

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The invitation email lets the person choose their own password — the admin never sees it.
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name, phone: data.phone || null },
      redirectTo: data.redirect_to,
    });
    if (error || !invited.user) {
      const msg = error?.message ?? "";
      if (/already/i.test(msg)) throw new Error("An account with this email already exists.");
      console.error("invite failed", msg);
      throw new Error("Could not send the invitation. Please try again.");
    }
    const id = invited.user.id;
    const { error: upErr } = await ctx.supabase
      .from("profiles")
      .update({ full_name: data.full_name, phone: data.phone || null })
      .eq("id", id);
    if (upErr) throw new Error(upErr.message);
    const roleRes = await ctx.supabase.rpc("admin_set_staff_role", { _user: id, _role: data.role });
    if (roleRes.error) throw new Error(roleRes.error.message);
    const actRes = await ctx.supabase.rpc("admin_set_staff_active", { _user: id, _active: data.is_active });
    if (actRes.error) throw new Error(actRes.error.message);
    if (!data.is_active) {
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: BAN_FOREVER });
    }
    return { id };
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { error } = await ctx.supabase.rpc("admin_set_staff_active", { _user: data.id, _active: data.active });
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Blocking sign-in at the login level; records and history are untouched.
    const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.active ? "none" : BAN_FOREVER,
    });
    if (banErr) {
      console.error("ban update failed", banErr.message);
      throw new Error("Status saved, but sign-in access could not be updated. Please try again.");
    }
    return { ok: true };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), role: z.enum(["admin", "staff"]) }).parse(d))
  .handler(async ({ context, data }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { error } = await ctx.supabase.rpc("admin_set_staff_role", { _user: data.id, _role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ email: z.string().email(), redirect_to: z.string().url() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo: data.redirect_to });
    if (error) throw new Error("Could not send the email. Please try again.");
    return { ok: true };
  });
