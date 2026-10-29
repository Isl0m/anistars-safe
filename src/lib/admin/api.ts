import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";

import { db } from "@/db";
import { adminLogs } from "@/db/schema/admin-log";

import { isOwner } from "./owner";
import { addAdminJob, AdminJob, AdminJobOutcome } from "./queue";

/** Every admin route goes through this: a valid Telegram login of the owner. */
export async function requireOwner(request: Request) {
  const authed = await requireAuth(request);
  if ("error" in authed) return authed;
  if (!isOwner(authed.auth.id)) {
    return { error: errorResponse("Forbidden", 403) };
  }
  return { ownerId: authed.auth.id };
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string | null,
  details?: unknown
) {
  await db
    .insert(adminLogs)
    .values({ adminId, action, targetUserId, details: details ?? null })
    .catch((e) => console.error("admin log write failed:", e));
}

/**
 * Same contract as `marketJobResponse`: 200 done, 409 refused with the bot's
 * wording, 202 still running, 500 queue unreachable.
 */
function adminJobResponse(outcome: AdminJobOutcome) {
  if (outcome.status === "failed") {
    console.error("admin job failed:", outcome.error);
    return errorResponse("Бот не смог выполнить действие", 500);
  }
  if (outcome.status === "pending") {
    return NextResponse.json(
      {
        ok: false,
        pending: true,
        message: "Бот ещё выполняет действие, обновите страницу позже",
      },
      { status: 202 }
    );
  }
  const { ok, message } = outcome.result;
  if (!ok) return errorResponse(message, 409);
  return NextResponse.json({ ok: true, message });
}

/** Runs a job on the bot, logs it unless the bot refused, and answers. */
export async function runAdminJob(ownerId: string, job: AdminJob) {
  const outcome = await addAdminJob(job);
  if (
    outcome.status !== "failed" &&
    !(outcome.status === "done" && !outcome.result.ok)
  ) {
    const { type, ...details } = job;
    await logAdminAction(
      ownerId,
      type,
      "userId" in job ? job.userId : null,
      details
    );
  }
  return adminJobResponse(outcome);
}
