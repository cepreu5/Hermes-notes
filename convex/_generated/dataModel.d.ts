// AUTO-GENERATED stub — replaced by `npx convex dev` at runtime
import type { GenericId } from "convex/values";

export type Id<TableName extends string> = GenericId<TableName>;

interface SystemFields {
  _id: Id<string>;
  _creationTime: number;
}

export interface Doc<TableName extends string> extends SystemFields {
  // users
  tokenIdentifier: TableName extends "users" ? string : never;
  name: TableName extends "users" | "boards" ? string | undefined : never;
  email: TableName extends "users" ? string | undefined : never;
  avatar: TableName extends "users" ? string | undefined : never;

  // boards
  userId: TableName extends "boards" | "labels" | "notes" ? Id<"users"> : never;
  colorIndex: TableName extends "boards" | "notes" ? number : never;
  order: TableName extends "boards" | "notes" ? number : never;

  // labels
  colorHex: TableName extends "labels" ? string : never;

  // notes
  boardId: TableName extends "notes" ? Id<"boards"> | undefined : never;
  title: TableName extends "notes" ? string : never;
  content: TableName extends "notes" ? string : never;
  isPinned: TableName extends "notes" ? boolean : never;
  pinnedAt: TableName extends "notes" ? string | undefined : never;
  labelIds: TableName extends "notes" ? Id<"labels">[] | undefined : never;
  dueDate: TableName extends "notes" ? string | undefined : never;
  reminderAt: TableName extends "notes" ? string | undefined : never;
  reminderSent: TableName extends "notes" ? boolean | undefined : never;

  // pushIdentities
  secret: TableName extends "pushIdentities" ? string : never;
  visitorId: TableName extends "pushIdentities" ? string : never;

  // allow any extra keys so the stub doesn't block real usage
  [key: string]: unknown;
}
