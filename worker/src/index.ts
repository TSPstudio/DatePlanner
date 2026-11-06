export interface Env {
  DB: D1Database;
  AUTH_SECRET?: string;
  USER1_NAME?: string;
  USER1_PASSWORD?: string;
  USER2_NAME?: string;
  USER2_PASSWORD?: string;
}

export interface DateItem {
  id: string;
  title: string;
  creator: string;
  created_at: number;
  cooldown_until: number | null;
  roll_count: number;
  remaining_ms?: number;
}

interface LoginPayload {
  username?: string;
  password?: string;
}

interface CreateDatePayload {
  title?: string;
  creator?: string;
}

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

const COOLDOWN_DAYS = 14;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const TOKEN_EXPIRY_DAYS = 30;
const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

const FALLBACK_SECRET = "date-planner-default-secret-salt-key-2026";
const FALLBACK_USER1_NAME = "Partner1";
const FALLBACK_USER1_PASS = "love2026";
const FALLBACK_USER2_NAME = "Partner2";
const FALLBACK_USER2_PASS = "magic2026";

function createCorsHeaders(): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

function jsonResponse(data: unknown, status = HTTP_OK): Response {
  const headers = createCorsHeaders();
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { status, headers });
}

function handleOptions(): Response {
  return new Response(null, {
    status: HTTP_NO_CONTENT,
    headers: createCorsHeaders(),
  });
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBuffer(base64: string): ArrayBuffer {
  let str = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4 !== 0) {
    str += "=";
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function timingSafeEqualStrings(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const hashA = await crypto.subtle.digest("SHA-256", encoder.encode(a));
  const hashB = await crypto.subtle.digest("SHA-256", encoder.encode(b));
  return crypto.subtle.timingSafeEqual(hashA, hashB);
}

async function signToken(username: string, secret: string): Promise<string> {
  const expiry = Date.now() + TOKEN_EXPIRY_MS;
  const payloadStr = JSON.stringify({ u: username, exp: expiry });
  const payloadB64 = btoa(payloadStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const key = await getCryptoKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${bufferToBase64(signature)}`;
}

async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, signatureB64] = parts;
    const key = await getCryptoKey(secret);
    const signatureBuffer = base64ToBuffer(signatureB64);
    const isValid = await crypto.subtle.verify("HMAC", key, signatureBuffer, new TextEncoder().encode(payloadB64));
    if (!isValid) return null;
    const parsed = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))) as { u: string; exp: number };
    if (!parsed.u || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.u;
  } catch (err) {
    return null;
  }
}

async function authenticateCredentials(payload: LoginPayload, env: Env): Promise<string | null> {
  if (!payload.username || !payload.password) return null;
  const u1Name = env.USER1_NAME || FALLBACK_USER1_NAME;
  const u1Pass = env.USER1_PASSWORD || FALLBACK_USER1_PASS;
  const u2Name = env.USER2_NAME || FALLBACK_USER2_NAME;
  const u2Pass = env.USER2_PASSWORD || FALLBACK_USER2_PASS;

  const matchesUser1Name = await timingSafeEqualStrings(payload.username, u1Name);
  const matchesUser1Pass = await timingSafeEqualStrings(payload.password, u1Pass);
  if (matchesUser1Name && matchesUser1Pass) return u1Name;

  const matchesUser2Name = await timingSafeEqualStrings(payload.username, u2Name);
  const matchesUser2Pass = await timingSafeEqualStrings(payload.password, u2Pass);
  if (matchesUser2Name && matchesUser2Pass) return u2Name;

  return null;
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const payload = (await request.json()) as LoginPayload;
    const authenticatedUser = await authenticateCredentials(payload, env);
    if (!authenticatedUser) {
      return jsonResponse({ error: "Invalid username or password" }, HTTP_UNAUTHORIZED);
    }
    const secret = env.AUTH_SECRET || FALLBACK_SECRET;
    const token = await signToken(authenticatedUser, secret);
    return jsonResponse({ token, username: authenticatedUser });
  } catch (err) {
    return jsonResponse({ error: "Invalid request payload" }, HTTP_BAD_REQUEST);
  }
}

async function extractAuthUser(request: Request, env: Env): Promise<string | null> {
  const header = request.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  const secret = env.AUTH_SECRET || FALLBACK_SECRET;
  return verifyToken(token, secret);
}

async function handleGetDates(env: Env): Promise<Response> {
  const now = Date.now();
  const result = await env.DB.prepare(
    "SELECT id, title, creator, created_at, cooldown_until, roll_count FROM dates ORDER BY created_at DESC"
  ).all<DateItem>();

  const allItems = result.results || [];
  const available: DateItem[] = [];
  const coolingDown: DateItem[] = [];

  for (const item of allItems) {
    if (item.cooldown_until && item.cooldown_until > now) {
      coolingDown.push({
        ...item,
        remaining_ms: item.cooldown_until - now,
      });
    } else {
      available.push(item);
    }
  }

  return jsonResponse({ available, coolingDown, total: allItems.length });
}

async function handleCreateDate(request: Request, env: Env, authUser: string): Promise<Response> {
  try {
    const payload = (await request.json()) as CreateDatePayload;
    const title = payload.title?.trim();
    if (!title) {
      return jsonResponse({ error: "Title is required" }, HTTP_BAD_REQUEST);
    }
    const creator = payload.creator?.trim() || authUser;
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    await env.DB.prepare(
      "INSERT INTO dates (id, title, creator, created_at, cooldown_until, roll_count) VALUES (?, ?, ?, ?, NULL, 0)"
    ).bind(id, title, creator, createdAt).run();

    return jsonResponse({
      id,
      title,
      creator,
      created_at: createdAt,
      cooldown_until: null,
      roll_count: 0,
    }, HTTP_CREATED);
  } catch (err) {
    return jsonResponse({ error: "Failed to create date plan" }, HTTP_INTERNAL_ERROR);
  }
}

function getRandomIndex(max: number): number {
  const randomArray = new Uint32Array(1);
  crypto.getRandomValues(randomArray);
  return randomArray[0] % max;
}

async function handleRollDate(env: Env): Promise<Response> {
  const now = Date.now();
  const availableResult = await env.DB.prepare(
    "SELECT id, title, creator, created_at, cooldown_until, roll_count FROM dates WHERE cooldown_until IS NULL OR cooldown_until <= ?"
  ).bind(now).all<DateItem>();

  const available = availableResult.results || [];
  if (available.length === 0) {
    return jsonResponse({
      status: "empty",
      message: "All dates are on cooldown!",
    }, HTTP_OK);
  }

  const selectedIndex = getRandomIndex(available.length);
  const selected = available[selectedIndex];
  const cooldownUntil = now + COOLDOWN_MS;
  const newRollCount = selected.roll_count + 1;

  await env.DB.prepare(
    "UPDATE dates SET cooldown_until = ?, roll_count = ? WHERE id = ?"
  ).bind(cooldownUntil, newRollCount, selected.id).run();

  return jsonResponse({
    status: "rolled",
    date: {
      ...selected,
      cooldown_until: cooldownUntil,
      roll_count: newRollCount,
      remaining_ms: COOLDOWN_MS,
    },
  });
}

async function handleResetCooldown(id: string, env: Env): Promise<Response> {
  await env.DB.prepare(
    "UPDATE dates SET cooldown_until = NULL WHERE id = ?"
  ).bind(id).run();
  return jsonResponse({ success: true, id });
}

async function handleDeleteDate(id: string, env: Env): Promise<Response> {
  await env.DB.prepare("DELETE FROM dates WHERE id = ?").bind(id).run();
  return jsonResponse({ success: true, id });
}

async function routeProtected(request: Request, env: Env, pathname: string, user: string): Promise<Response> {
  if (request.method === "GET" && pathname === "/api/dates") {
    return handleGetDates(env);
  }
  if (request.method === "POST" && pathname === "/api/dates") {
    return handleCreateDate(request, env, user);
  }
  if (request.method === "POST" && pathname === "/api/dates/roll") {
    return handleRollDate(env);
  }
  if (request.method === "POST" && pathname.startsWith("/api/dates/") && pathname.endsWith("/reset-cooldown")) {
    const id = pathname.slice("/api/dates/".length, -"/reset-cooldown".length);
    return handleResetCooldown(id, env);
  }
  if (request.method === "DELETE" && pathname.startsWith("/api/dates/")) {
    const id = pathname.slice("/api/dates/".length);
    return handleDeleteDate(id, env);
  }
  return jsonResponse({ error: "Endpoint not found" }, HTTP_NOT_FOUND);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "POST" && pathname === "/api/login") {
      return handleLogin(request, env);
    }

    const authUser = await extractAuthUser(request, env);
    if (!authUser) {
      return jsonResponse({ error: "Unauthorized access" }, HTTP_UNAUTHORIZED);
    }

    try {
      return await routeProtected(request, env, pathname, authUser);
    } catch (err) {
      return jsonResponse({ error: "Internal server error" }, HTTP_INTERNAL_ERROR);
    }
  },
};
