/**
 * Autenticazione dell'endpoint di export.
 *
 * E' logica pura di proposito: e' l'unica barriera davanti a un dump completo
 * del database, e vale la pena poterla provare senza rete ne' Deno.
 */

/**
 * Confronto a tempo costante fra due stringhe.
 *
 * Un `===` esce al primo carattere diverso: la differenza e' minuscola ma
 * misurabile, e su un segreto indovinabile carattere per carattere e' esattamente
 * l'informazione che non va data. Qui si confrontano sempre tutti i byte.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  // La lunghezza trapela comunque: si confronta la lunghezza piena e si
  // scorre sul massimo, cosi' il numero di iterazioni non dipende dal segreto.
  const len = Math.max(ba.length, bb.length);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export type AuthResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Decide se una richiesta puo' esportare.
 *
 * Fail-closed: se il segreto non e' configurato sul server la risposta e' 500,
 * non 200 e non 401. Un endpoint di dump che diventa pubblico perche' una
 * variabile d'ambiente manca sarebbe il guasto peggiore possibile.
 */
export function authorize(
  authorizationHeader: string | null,
  secret: string | undefined,
): AuthResult {
  if (!secret || secret.length === 0) {
    return { ok: false, status: 500, error: "ops_secret_missing" };
  }
  const header = authorizationHeader ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  const token = header.slice(prefix.length).trim();
  if (!timingSafeEqual(token, secret)) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}
