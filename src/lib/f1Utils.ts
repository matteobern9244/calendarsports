// Map Jolpica/Ergast textual nationality strings to ISO-3166-1 alpha-2 lowercase
// codes used by flagcdn.com. Riders/drivers without a mapped nationality fall back
// to null and the flag is simply not rendered (no broken image, no placeholder).
export const F1_NATIONALITY_TO_ISO: Record<string, string> = {
  'British': 'gb',
  'Dutch': 'nl',
  'Australian': 'au',
  'Monégasque': 'mc',
  'Monegasque': 'mc',
  'Spanish': 'es',
  'Mexican': 'mx',
  'French': 'fr',
  'German': 'de',
  'Finnish': 'fi',
  'Canadian': 'ca',
  'Japanese': 'jp',
  'Thai': 'th',
  'Chinese': 'cn',
  'American': 'us',
  'Italian': 'it',
  'Argentine': 'ar',
  'Argentinian': 'ar',
  'Brazilian': 'br',
  'New Zealander': 'nz',
  'Danish': 'dk',
  'Belgian': 'be',
  'Swedish': 'se',
  'Swiss': 'ch',
  'Russian': 'ru',
  'Polish': 'pl',
  'Austrian': 'at',
  'Portuguese': 'pt',
  'Indonesian': 'id',
  'Malaysian': 'my',
  'South African': 'za',
  'Turkish': 'tr',
  'Venezuelan': 've',
  'Colombian': 'co',
  'Irish': 'ie',
};

export function f1NationalityToIso(n?: string | null): string | null {
  if (!n) return null;
  return F1_NATIONALITY_TO_ISO[n.trim()] || null;
}