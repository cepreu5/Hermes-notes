import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireUser } from "./users.ts";

export const list = query({
  args: { boardId: v.optional(v.id("boards")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    if (args.boardId !== undefined) {
      const board = await ctx.db.get(args.boardId);
      if (!board || board.userId !== user._id) return [];
      return await ctx.db
        .query("notes")
        .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
        .order("asc")
        .collect();
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("asc")
      .collect();
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !args.query.trim()) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    const all = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const q = args.query.toLowerCase();
    return all.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  },
});

export const create = mutation({
  args: {
    boardId: v.optional(v.id("boards")),
    title: v.string(),
    content: v.string(),
    colorIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.boardId) {
      const board = await ctx.db.get(args.boardId);
      if (!board || board.userId !== user._id)
        throw new ConvexError({ message: "Board not found", code: "NOT_FOUND" });
    }
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    return await ctx.db.insert("notes", {
      userId: user._id,
      boardId: args.boardId,
      title: args.title,
      content: args.content,
      colorIndex: args.colorIndex,
      isPinned: false,
      order: existing.length,
    });
  },
});

export const update = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
    content: v.string(),
    colorIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.noteId, {
      title: args.title,
      content: args.content,
      colorIndex: args.colorIndex,
    });
  },
});

export const togglePin = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    const nowPinned = !note.isPinned;
    await ctx.db.patch(args.noteId, {
      isPinned: nowPinned,
      pinnedAt: nowPinned ? new Date().toISOString() : undefined,
    });
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id)
      throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.noteId);
  },
});
