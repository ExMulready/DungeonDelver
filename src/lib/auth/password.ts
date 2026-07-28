import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing with scrypt from node:crypto.
 *
 * Deliberately not Argon2id, despite that being the usual first choice. Every
 * Argon2 binding for Node is a native module, and a native module forces the
 * bundler to symlink it out of the build — which is impossible on this
 * project's exFAT volume (no symlink support) and breaks `next build` outright.
 * scrypt is memory-hard, built into Node, and explicitly listed by OWASP as an
 * acceptable alternative, so it costs nothing here and removes the only native
 * dependency in the tree. It also means the container can run on any libc.
 *
 * Digest format:  scrypt$N$r$p$<salt-b64>$<key-b64>
 * Parameters are stored per-digest so they can be raised later without
 * invalidating existing passwords.
 */

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/* N=2^16 with r=8 costs ~64 MiB per hash. maxmem must exceed that or Node
   refuses the call — its default ceiling is 32 MiB. */
const N = 65536;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 160 * 1024 * 1024;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(plain, salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  digest: string,
  plain: string,
): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, keyB64] = digest.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(keyB64, "base64");

    const actual = await scryptAsync(plain, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    });

    /* Constant-time: a plain === comparison leaks how many leading bytes
       matched, which is enough to recover the digest byte by byte. */
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    /* Malformed or truncated digest. Treated as a failed attempt rather than an
       error, so it is indistinguishable from a wrong password. */
    return false;
  }
}
