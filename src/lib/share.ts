// Portfolio sharing without a backend: the composition is JSON → raw-deflate →
// base64url, carried in the URL *fragment* (/p/#<token>). The fragment never
// leaves the browser, so nothing is sent to or stored on a server. Decoding is
// the inverse. Uses the platform CompressionStream — no dependency.

export type ShareItem = {
  c: string; // full coin id
  q?: number; // quantity (omitted when amounts are hidden)
  a?: number; // average cost (omitted when amounts are hidden)
  w?: number; // weight 0..1 (only when amounts are hidden)
};

export type SharePayload = {
  v: 1;
  hidden: boolean; // amounts hidden → only weights shared
  items: ShareItem[];
};

async function pipe(bytes: Uint8Array, stream: TransformStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buf);
}

const deflate = (b: Uint8Array) => pipe(b, new CompressionStream("deflate-raw"));
const inflate = (b: Uint8Array) =>
  pipe(b, new DecompressionStream("deflate-raw"));

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): Uint8Array {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(await deflate(bytes));
}

export async function decodeShare(token: string): Promise<SharePayload> {
  const bytes = await inflate(fromBase64Url(token));
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (payload?.v !== 1 || !Array.isArray(payload.items)) {
    throw new Error("bad share payload");
  }
  return payload as SharePayload;
}
