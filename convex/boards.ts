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
      .query("boards")
      .withIndex("by_userId_order", (q) => q.eq("userId", user._id))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string(), colorIndex: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("boards")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    return await ctx.db.insert("boards", {
      userId: user._id,
      name: args.name,
      colorIndex: args.colorIndex,
      order: existing.length,
    });
  },
});

export const update = mutation({
  args: { boardId: v.id("boards"), name: v.string(), colorIndex: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.boardId, { name: args.name, colorIndex: args.colorIndex });
  },
});

export const remove = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }
    await ctx.db.delete(args.boardId);
  },
});
