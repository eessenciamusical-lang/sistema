import { hasSupabaseEnv, hasSupabaseServiceRole, supabaseAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";
import { z } from "zod";

export const runtime = "nodejs";

const payloadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  message: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  if (!hasSupabaseEnv()) return new Response("Server not configured", { status: 500 });
  if (!hasSupabaseServiceRole()) return new Response("Service role missing", { status: 500 });

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const { error } = await supabaseAdmin.from("Lead").insert({
    id: newId(),
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    phone: parsed.data.phone?.trim() || null,
    message: parsed.data.message.trim(),
    createdAt: new Date().toISOString(),
  });

  if (error) return new Response("Server error", { status: 500 });
  return new Response("ok");
}

