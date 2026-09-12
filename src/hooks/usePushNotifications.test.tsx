import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subscribeToPush: vi.fn(),
  updatePushSettings: vi.fn(),
  unsubscribeFromPush: vi.fn(),
  getCurrentSubscription: vi.fn(),
}));

vi.mock("@/lib/pushClient", () => ({
  isPushSupported: () => true,
  isPreviewOrIframe: () => false,
  subscribeToPush: mocks.subscribeToPush,
  updatePushSettings: mocks.updatePushSettings,
  unsubscribeFromPush: mocks.unsubscribeFromPush,
  getCurrentSubscription: mocks.getCurrentSubscription,
}));

import { DEFAULT_SPORTS, usePushNotifications } from "./usePushNotifications";

describe("usePushNotifications", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.subscribeToPush.mockReset().mockResolvedValue({ ok: true });
    mocks.updatePushSettings.mockReset().mockResolvedValue(true);
    mocks.unsubscribeFromPush.mockReset().mockResolvedValue(true);
    mocks.getCurrentSubscription.mockReset().mockResolvedValue({});
  });

  it("di default i tre sport sono tutti accesi", () => {
    const { result } = renderHook(() => usePushNotifications("juventus"));
    expect(result.current.sports).toEqual(DEFAULT_SPORTS);
    expect(DEFAULT_SPORTS).toEqual({ football: true, f1: true, motogp: true });
  });

  it("all'attivazione manda la squadra seguita e gli sport scelti", async () => {
    const { result } = renderHook(() => usePushNotifications("milan"));
    await act(async () => {
      await result.current.enable();
    });
    expect(mocks.subscribeToPush).toHaveBeenCalledWith({
      leadTimes: [60],
      team: "milan",
      sports: { football: true, f1: true, motogp: true },
    });
  });

  it("spegnere uno sport lo persiste e, se attive, aggiorna l'iscrizione", async () => {
    const { result } = renderHook(() => usePushNotifications("milan"));
    await act(async () => {
      await result.current.enable();
    });
    await act(async () => {
      await result.current.setSport("f1", false);
    });
    expect(result.current.sports).toEqual({ football: true, f1: false, motogp: true });
    expect(mocks.updatePushSettings).toHaveBeenLastCalledWith({
      leadTimes: [60],
      team: "milan",
      sports: { football: true, f1: false, motogp: true },
      enabled: true,
    });
    expect(JSON.parse(window.localStorage.getItem("push.sports")!)).toEqual({
      football: true,
      f1: false,
      motogp: true,
    });
  });

  it("se la squadra cambia mentre le notifiche sono attive, l'iscrizione la segue", async () => {
    // Senza questo, chi passa da Juventus a Napoli continuerebbe a ricevere la
    // Juventus finche' non spegne e riaccende le notifiche.
    const { result, rerender } = renderHook(({ team }) => usePushNotifications(team), {
      initialProps: { team: "juventus" },
    });
    await act(async () => {
      await result.current.enable();
    });
    mocks.updatePushSettings.mockClear();
    rerender({ team: "napoli" });
    await waitFor(() =>
      expect(mocks.updatePushSettings).toHaveBeenCalledWith(
        expect.objectContaining({ team: "napoli", enabled: true }),
      ),
    );
  });

  it("con le notifiche spente un cambio squadra non chiama il server", async () => {
    const { rerender } = renderHook(({ team }) => usePushNotifications(team), {
      initialProps: { team: "juventus" },
    });
    rerender({ team: "napoli" });
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.updatePushSettings).not.toHaveBeenCalled();
  });
});
