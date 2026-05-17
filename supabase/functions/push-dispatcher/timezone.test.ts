import { describe, expect, it } from 'vitest';
import {
  formatRomeEventDateTime,
  formatRomeEventTime,
  getF1Season,
  getJuventusSeason,
  getMotoGPSeason,
  toEventDate,
  toEventTimestampMs,
} from './timezone';

describe('push dispatcher timezone Europe/Rome', () => {
  it('tratta gli ISO naive come UTC, come la UI Calendar Events', () => {
    expect(toEventDate('2026-04-21T19:00:00')?.toISOString()).toBe('2026-04-21T19:00:00.000Z');
    expect(toEventTimestampMs('2026-04-21T19:00:00')).toBe(
      toEventTimestampMs('2026-04-21T19:00:00Z'),
    );
  });

  it('formatta l’orario della notifica in fuso italiano durante l’ora legale', () => {
    expect(formatRomeEventTime('2026-04-21T19:00:00Z')).toBe('21:00');
    expect(formatRomeEventDateTime('2026-04-21T19:00:00Z')).toBe('21/04/2026, 21:00');
  });

  it('formatta l’orario della notifica in fuso italiano durante l’ora solare', () => {
    expect(formatRomeEventTime('2026-01-15T19:00:00Z')).toBe('20:00');
    expect(formatRomeEventDateTime('2026-01-15T19:00:00Z')).toBe('15/01/2026, 20:00');
  });

  it('non altera gli offset espliciti ricevuti dai provider', () => {
    expect(toEventDate('2026-04-21T21:00:00+02:00')?.toISOString()).toBe('2026-04-21T19:00:00.000Z');
    expect(formatRomeEventTime('2026-04-21T21:00:00+02:00')).toBe('21:00');
  });

  it('calcola le stagioni dal giorno italiano e non dal giorno UTC del runtime', () => {
    const nearMidnightUtc = new Date('2026-06-30T22:30:00Z'); // 01/07/2026 a Roma
    expect(getF1Season(nearMidnightUtc)).toBe(2026);
    expect(getMotoGPSeason(nearMidnightUtc)).toBe(2026);
    expect(getJuventusSeason(nearMidnightUtc)).toBe(2026);
  });
});
