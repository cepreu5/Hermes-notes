import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatar: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  boards: defineTable({
    userId: v.id("users"),
    name: v.string(),
    colorIndex: v.number(),
    order: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_order", ["userId", "order"]),

  labels: defineTable({
    userId: v.id("users"),
    name: v.string(),
    colorHex: v.string(),
  }).index("by_userId", ["userId"]),

  notes: defineTable({
    userId: v.id("users"),
    boardId: v.optional(v.id("boards")),
    title: v.string(),
    content: v.string(),
    colorIndex: v.number(),
    isPinned: v.boolean(),
    pinnedAt: v.optional(v.string()),
    order: v.number(),
    labelIds: v.optional(v.array(v.id("labels"))),
  })
    .index("by_userId", ["userId"])
    .index("by_boardId", ["boardId"])
    .index("by_userId_pinned", ["userId", "isPinned"]),
});
