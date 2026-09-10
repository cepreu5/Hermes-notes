import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireUser } from "./users.ts";

/** Generate a random URL-safe token */
function randomToken(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** Create or return existing share link for a note */
export const createShareLink = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id)
      throw new ConvexError({ message: "Note not found", code: "NOT_FOUND" });

    // Return existing share if already shared
    const existing = await ctx.db
      .query("sharedNotes")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .first();
    if (existing) return existing.token;

    const token = randomToken();
    await ctx.db.insert("sharedNotes", {
      noteId: args.noteId,
      token,
      createdAt: new Date().toISOString(),
    });
    return token;
  },
});

/** Remove share link */
export const removeShareLink = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== user._id)
      throw new ConvexError({ message: "Note not found", code: "NOT_FOUND" });

    const share = await ctx.db
      .query("sharedNotes")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .first();
    if (share) await ctx.db.delete(share._id);
  },
});

/** Check if a note has a share link (returns token or null) */
export const getShareToken = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const share = await ctx.db
      .query("sharedNotes")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .first();
    return share?.token ?? null;
  },
});

/** Public query — no auth required — returns note data for a share token */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("sharedNotes")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!share) return null;
    const note = await ctx.db.get(share.noteId);
    if (!note) return null;
    // Return only safe public fields
    return {
      title: note.title,
      content: note.content,
      colorIndex: note.colorIndex,
      dueDate: note.dueDate,
      createdAt: share.createdAt,
    };
  },
});
