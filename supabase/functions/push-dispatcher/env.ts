export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Variabile ambiente mancante: ${name}`);
  }
  return value;
}

export const dispatcherConfig = {
  supabaseUrl: requiredEnv('SUPABASE_URL'),
  serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  anonKey: requiredEnv('SUPABASE_ANON_KEY'),
  vapidPublicKey: requiredEnv('VAPID_PUBLIC_KEY'),
  vapidPrivateKey: requiredEnv('VAPID_PRIVATE_KEY'),
  vapidSubject: Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
};
