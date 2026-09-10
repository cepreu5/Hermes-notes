import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireUser } from "./users.ts";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    return await ctx.db
      .query("labels")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string(), colorHex: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert("labels", {
      userId: user._id,
      name: args.name,
      colorHex: args.colorHex,
    });
  },
});

export const update = mutation({
  args: { labelId: v.id("labels"), name: v.string(), colorHex: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const label = await ctx.db.get(args.labelId);
    if (!label || label.userId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.labelId, { name: args.name, colorHex: args.colorHex });
  },
});

export const remove = mutation({
  args: { labelId: v.id("labels") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const label = await ctx.db.get(args.labelId);
    if (!label || label.userId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.labelId);
  },
});
