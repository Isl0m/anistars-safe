import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Mirrors anistars-bot/src/db/schema/admin-log.ts. */
export const adminLogs = pgTable(
  "AdminLog",
  {
    id: serial("id").primaryKey(),
    adminId: text("adminId").notNull(),
    action: text("action").notNull(),
    targetUserId: text("targetUserId"),
    details: jsonb("details"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("admin_log_created_at_idx").on(table.createdAt),
    index("admin_log_target_user_idx").on(table.targetUserId),
  ]
);

export type AdminLog = typeof adminLogs.$inferSelect;
