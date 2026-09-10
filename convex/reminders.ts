import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";

// Called by cron every minute — finds notes whose reminder is due and sends push notifications
export const checkAndSend = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx): Promise<void> => {
    const now = new Date().toISOString();

    // Fetch a bounded batch of notes with pending reminders
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_reminderAt")
      .filter((q) =>
        q.and(
          q.neq(q.field("reminderAt"), undefined),
          q.lte(q.field("reminderAt"), now),
          q.neq(q.field("reminderSent"), true),
        )
      )
      .take(50);

    for (const note of notes) {
      // Mark as sent immediately to prevent double-send
      await ctx.db.patch(note._id, { reminderSent: true });

      // Look up user tokenIdentifier to derive visitorId
      const user = await ctx.db.get(note.userId);
      if (!user) continue;

      // visitorId = subject part of tokenIdentifier (after last "|")
      const visitorId = user.tokenIdentifier.split("|").pop();
      if (!visitorId) continue;

      const title = note.title.trim() || "CX Notes reminder";
      const body = note.dueDate
        ? `Due: ${new Date(note.dueDate).toLocaleDateString()}`
        : "You have a note reminder.";

      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendNotification, {
        visitorIds: [visitorId],
        title,
        body,
        urgency: "high",
      });
    }
  },
});