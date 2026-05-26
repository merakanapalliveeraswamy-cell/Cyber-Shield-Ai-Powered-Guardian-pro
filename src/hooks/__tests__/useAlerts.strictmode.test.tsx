import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";

// Mock auth to provide a stable user
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-id" } }),
}));

// Track channel lifecycle to detect the "add postgres_changes after subscribe()" bug
const channelLog: Array<{ topic: string; event: string }> = [];

vi.mock("@/integrations/supabase/client", () => {
  const makeChannel = (topic: string) => {
    let subscribed = false;
    const channel: any = {
      topic,
      on: (_type: string, _filter: unknown, _cb: unknown) => {
        if (subscribed) {
          // This is the exact failure mode we are regression-testing.
          throw new Error(
            `cannot add \`postgres_changes\` callbacks for ${topic} after \`subscribe()\``
          );
        }
        channelLog.push({ topic, event: "on" });
        return channel;
      },
      subscribe: () => {
        subscribed = true;
        channelLog.push({ topic, event: "subscribe" });
        return channel;
      },
      unsubscribe: () => {
        channelLog.push({ topic, event: "unsubscribe" });
        return Promise.resolve("ok");
      },
    };
    return channel;
  };

  return {
    supabase: {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
          in: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      channel: (topic: string) => {
        channelLog.push({ topic, event: "create" });
        return makeChannel(topic);
      },
      removeChannel: (ch: any) => {
        channelLog.push({ topic: ch.topic, event: "remove" });
        return Promise.resolve("ok");
      },
    },
  };
});

describe("useAlerts under React StrictMode", () => {
  beforeEach(() => {
    channelLog.length = 0;
  });

  it("does not throw 'subscribe after subscribe()' when effects mount twice", async () => {
    const { useAlerts } = await import("../useAlerts");

    // StrictMode in dev intentionally double-invokes effects: mount → cleanup → mount.
    // If the hook reused a single channel across mounts, the second `.on(...)` would
    // throw the realtime error we are guarding against.
    expect(() =>
      renderHook(() => useAlerts(), { wrapper: StrictMode })
    ).not.toThrow();

    await waitFor(() => {
      expect(channelLog.some((e) => e.event === "subscribe")).toBe(true);
    });

    // Sanity: every channel that was subscribed must use a unique topic so the
    // StrictMode remount can't collide with a still-registered channel.
    const subscribedTopics = channelLog
      .filter((e) => e.event === "subscribe")
      .map((e) => e.topic);
    expect(new Set(subscribedTopics).size).toBe(subscribedTopics.length);
  });
});
