import { beforeEach, describe, expect, it } from "vitest";

import {
  selectHistory,
  selectLive,
  selectUnreadCount,
  useNotificationStore,
} from "@/store/notificationStore";

describe("notificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  describe("notify", () => {
    it("adds a notification that is unread and not dismissed", () => {
      const { notify } = useNotificationStore.getState();
      const id = notify({
        title: "Parsing…",
        status: "progress",
        transient: false,
      });

      const notification = useNotificationStore
        .getState()
        .notifications.find((n) => n.id === id);

      expect(notification).toMatchObject({
        title: "Parsing…",
        status: "progress",
        read: false,
        dismissed: false,
        transient: false,
      });
    });

    it("prepends new notifications so history is newest-first", () => {
      const { notify } = useNotificationStore.getState();
      const firstId = notify({
        title: "first",
        status: "info",
        transient: false,
      });
      const secondId = notify({
        title: "second",
        status: "info",
        transient: false,
      });

      const ids = useNotificationStore
        .getState()
        .notifications.map((n) => n.id);
      expect(ids).toEqual([secondId, firstId]);
    });

    it("caps history at 100 entries, dropping the oldest", () => {
      const { notify } = useNotificationStore.getState();
      const ids = Array.from({ length: 101 }, (_, i) =>
        notify({ title: `n${i}`, status: "info", transient: false })
      );

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(100);
      expect(state.notifications.find((n) => n.id === ids[0])).toBeUndefined();
      expect(state.notifications[0].id).toBe(ids[100]);
    });
  });

  describe("update", () => {
    it("patches fields on the target notification only", () => {
      const { notify, update } = useNotificationStore.getState();
      const targetId = notify({
        title: "target",
        status: "progress",
        transient: false,
      });
      const otherId = notify({
        title: "other",
        status: "progress",
        transient: false,
      });

      update(targetId, { title: "updated", status: "success" });

      const state = useNotificationStore.getState();
      expect(state.notifications.find((n) => n.id === targetId)).toMatchObject({
        title: "updated",
        status: "success",
      });
      expect(state.notifications.find((n) => n.id === otherId)).toMatchObject({
        title: "other",
        status: "progress",
      });
    });

    it("is a no-op when the id doesn't exist", () => {
      const { notify, update } = useNotificationStore.getState();
      notify({ title: "a", status: "info", transient: false });
      const before = useNotificationStore.getState().notifications;

      update("does-not-exist", { title: "nope" });

      expect(useNotificationStore.getState().notifications).toEqual(before);
    });

    it("resets dismissed to false when status transitions into success", () => {
      const { notify, dismiss, update } = useNotificationStore.getState();
      const id = notify({
        title: "job",
        status: "progress",
        transient: false,
      });
      dismiss(id);

      update(id, { status: "success" });

      expect(
        useNotificationStore.getState().notifications.find((n) => n.id === id)
          ?.dismissed
      ).toBe(false);
    });

    it("resets dismissed to false when status transitions into error", () => {
      const { notify, dismiss, update } = useNotificationStore.getState();
      const id = notify({
        title: "job",
        status: "progress",
        transient: false,
      });
      dismiss(id);

      update(id, { status: "error" });

      expect(
        useNotificationStore.getState().notifications.find((n) => n.id === id)
          ?.dismissed
      ).toBe(false);
    });

    it("does not un-dismiss when the patch doesn't touch status", () => {
      const { notify, dismiss, update } = useNotificationStore.getState();
      const id = notify({
        title: "job",
        status: "progress",
        transient: false,
      });
      dismiss(id);

      update(id, { title: "still progressing" });

      expect(
        useNotificationStore.getState().notifications.find((n) => n.id === id)
          ?.dismissed
      ).toBe(true);
    });

    it("does not un-dismiss when status is patched to the same value", () => {
      const { notify, dismiss, update } = useNotificationStore.getState();
      const id = notify({
        title: "job",
        status: "success",
        transient: false,
      });
      dismiss(id);

      update(id, { status: "success" });

      expect(
        useNotificationStore.getState().notifications.find((n) => n.id === id)
          ?.dismissed
      ).toBe(true);
    });
  });

  describe("dismiss / remove", () => {
    it("dismiss hides a notification from selectLive but keeps it in selectHistory", () => {
      const { notify, dismiss } = useNotificationStore.getState();
      const id = notify({ title: "job", status: "info", transient: false });

      dismiss(id);

      const state = useNotificationStore.getState();
      expect(selectLive(state).some((n) => n.id === id)).toBe(false);
      expect(selectHistory(state).some((n) => n.id === id)).toBe(true);
    });

    it("remove deletes the notification entirely", () => {
      const { notify, remove } = useNotificationStore.getState();
      const id = notify({ title: "job", status: "info", transient: false });

      remove(id);

      expect(
        useNotificationStore.getState().notifications.some((n) => n.id === id)
      ).toBe(false);
    });
  });

  describe("markRead / markAllRead", () => {
    it("markRead marks only the target notification as read", () => {
      const { notify, markRead } = useNotificationStore.getState();
      const targetId = notify({ title: "a", status: "info", transient: false });
      const otherId = notify({ title: "b", status: "info", transient: false });

      markRead(targetId);

      const state = useNotificationStore.getState();
      expect(state.notifications.find((n) => n.id === targetId)?.read).toBe(
        true
      );
      expect(state.notifications.find((n) => n.id === otherId)?.read).toBe(
        false
      );
    });

    it("markAllRead marks every notification as read", () => {
      const { notify, markAllRead } = useNotificationStore.getState();
      notify({ title: "a", status: "info", transient: false });
      notify({ title: "b", status: "info", transient: false });

      markAllRead();

      expect(
        useNotificationStore.getState().notifications.every((n) => n.read)
      ).toBe(true);
    });
  });

  describe("clear", () => {
    it("wipes all notifications", () => {
      const { notify, clear } = useNotificationStore.getState();
      notify({ title: "a", status: "info", transient: false });
      notify({ title: "b", status: "info", transient: false });

      clear();

      expect(useNotificationStore.getState().notifications).toEqual([]);
    });
  });

  describe("selectUnreadCount", () => {
    it("counts only unread notifications", () => {
      const { notify, markRead } = useNotificationStore.getState();
      const id1 = notify({ title: "a", status: "info", transient: false });
      notify({ title: "b", status: "info", transient: false });
      markRead(id1);

      expect(selectUnreadCount(useNotificationStore.getState())).toBe(1);
    });

    it("is zero on an empty store", () => {
      expect(selectUnreadCount(useNotificationStore.getState())).toBe(0);
    });
  });
});
