const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_NO_DASH_RE = /^[0-9a-f]{32}$/i;
const USR_RE = /^USR-(\d+)$/i;

export function normalizeUserParam(raw) {
  const param = (raw ?? "").toString().trim();

  if (UUID_RE.test(param)) return { kind: "uuid", value: param.toLowerCase() };

  if (UUID_NO_DASH_RE.test(param)) {
    const v = param.toLowerCase();
    const dashed = `${v.slice(0,8)}-${v.slice(8,12)}-${v.slice(12,16)}-${v.slice(16,20)}-${v.slice(20)}`;
    return { kind: "uuid", value: dashed };
  }

  const m = param.match(USR_RE);
  if (m) return { kind: "public_id", value: Number(m[1]) };

  if (/^\d+$/.test(param)) return { kind: "public_id", value: Number(param) };

  return { kind: "ref_code", value: param };
}

export async function resolveUserByParam(supabase, USERS_TABLE, rawParam) {
  const norm = normalizeUserParam(rawParam);

  console.info(`[ADMIN] resolveUserByParam: raw="${rawParam}", kind=${norm.kind}, value="${norm.value}"`);

  let q = supabase.from(USERS_TABLE).select("*").limit(1);

  if (norm.kind === "uuid") q = q.eq("id", norm.value);
  if (norm.kind === "public_id") q = q.eq("public_id", norm.value);
  if (norm.kind === "ref_code") q = q.eq("ref_code", norm.value);

  const { data, error } = await q.maybeSingle();

  if (error) {
    console.error("[ADMIN] resolveUserByParam DB error:", error.message);
    return null;
  }
  if (!data) {
    console.info(`[ADMIN] resolveUserByParam: NOT FOUND for raw="${rawParam}", kind=${norm.kind}`);
    return null;
  }

  console.info(`[ADMIN] resolveUserByParam: FOUND user id=${data.id}, public_id=${data.public_id}`);
  return { user: data, resolvedBy: norm.kind, resolvedValue: norm.value };
}
