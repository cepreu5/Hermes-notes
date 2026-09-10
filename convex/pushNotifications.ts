"use node";

import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

const hercules = new Hercules({ apiKey: process.env.HERCULES_API_KEY!, apiVersion: "2025-12-09" });

// Matches the email validation used by the push notifications API.
const emailPattern =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

function getSubscriberMetadata(identity: { name?: string | null; email?: string | null }) {
  const displayName = identity.name?.trim();
  const email = identity.email?.trim();
  const subscriber = {
    ...(displayName && displayName.length <= 255 ? { displayName } : {}),
    ...(email && email.length <= 255 && emailPattern.test(email) ? { email } : {}),
  };
  return Object.keys(subscriber).length > 0 ? subscriber : undefined;
}

export const getVapidPublicKey = action({
  args: {},
  handler: async () => {
    try {
      const { vapidPublicKey } = await hercules.pushNotifications.enable();
      return { vapidPublicKey };
    } catch (error) {
      console.error("Failed to get VAPID public key:", error);
      throw new Error("Failed to enable push notifications");
    }
  },
});

export const subscribe = action({
  args: { subscription: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const visitorId = identity?.subject ?? crypto.randomUUID();
    const subscriber = getSubscriberMetadata(identity ?? {});

    const sub = JSON.parse(args.subscription) as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      expirationTime: number | null;
    };
    const { secret } = await hercules.pushNotifications.subscribe({
      visitorId,
      subscriber,
      subscription: {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        expirationTime: sub.expirationTime,
      },
    });

    await ctx.runMutation(internal.pushIdentities.storeIdentity, { secret, visitorId });
    return { secret };
  },
});

export const identify = action({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to identify");
    }

    const userId = identity.subject;
    const subscriber = getSubscriberMetadata(identity);
    const result = await hercules.pushNotifications.identify({
      secret: args.secret,
      userId,
      subscriber,
    });

    if (result.success) {
      await ctx.runMutation(internal.pushIdentities.updateIdentityVisitorId, {
        secret: args.secret,
        visitorId: userId,
      });
    }

    return result;
  },
});

export const unsubscribe = action({
  args: { secret: v.string() },
  handler: async (ctx, args) => {
    await hercules.pushNotifications.unsubscribe({ secret: args.secret });
    await ctx.runMutation(internal.pushIdentities.deleteIdentity, { secret: args.secret });
    return { success: true };
  },
});

// Called by the reminders cron to send push notifications for due notes
export const sendNotification = internalAction({
  args: {
    visitorIds: v.optional(v.array(v.string())),
    title: v.string(),
    body: v.optional(v.string()),
    icon: v.optional(v.string()),
    badge: v.optional(v.string()),
    image: v.optional(v.string()),
    urgency: v.optional(
      v.union(v.literal("very-low"), v.literal("low"), v.literal("normal"), v.literal("high")),
    ),
  },
  handler: async (_, args) => {
    const result = await hercules.pushNotifications.send({
      visitorIds: args.visitorIds,
      title: args.title,
      body: args.body,
      icon: args.icon,
      badge: args.badge,
      image: args.image,
      urgency: args.urgency,
    });
    return result;
  },
});
