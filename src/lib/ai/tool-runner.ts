import "server-only";
import { prisma } from "@/lib/db/client";
import { getTool } from "@/lib/ai/tools/registry";
import type { ChatMessage, ToolContext } from "@/lib/ai/types";

export interface ToolCallOutcome {
  toolName: string;
  status: "SUCCESS" | "ERROR" | "PENDING_CONFIRMATION";
  resultSummary: string;
  /** Present only when status is PENDING_CONFIRMATION — the id to pass to confirmPendingAction. */
  pendingActionId?: string;
  data?: unknown;
}

/**
 * Validates and executes (or defers) a single tool call requested by the model. This is the
 * only place a model-requested action reaches the database — arguments are always re-validated
 * with the tool's Zod schema, and `ctx.userId` always comes from the authenticated session,
 * never from the model. See ARCHITECTURE.md "AI tool layer (enforcement)".
 */
export async function executeToolCall(
  toolName: string,
  rawInput: unknown,
  ctx: ToolContext,
  userMessage: string | undefined,
): Promise<ToolCallOutcome> {
  const tool = getTool(toolName);
  if (!tool) {
    return { toolName, status: "ERROR", resultSummary: `Unknown tool '${toolName}'.` };
  }

  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    await prisma.aIActionLog.create({
      data: {
        userId: ctx.userId,
        userMessage,
        toolName,
        toolArgsJson: JSON.stringify(rawInput),
        requiresConfirmation: tool.requiresConfirmation,
        status: "ERROR",
        resultSummary: `Invalid arguments: ${parsed.error.issues[0]?.message ?? "validation failed"}`,
      },
    });
    return { toolName, status: "ERROR", resultSummary: `Invalid arguments for ${toolName}.` };
  }

  if (tool.requiresConfirmation) {
    const description = tool.describeCall?.(parsed.data, ctx) ?? ctx.t("Run {tool}", { tool: toolName });
    const log = await prisma.aIActionLog.create({
      data: {
        userId: ctx.userId,
        userMessage,
        toolName,
        toolArgsJson: JSON.stringify(parsed.data),
        requiresConfirmation: true,
        wasConfirmed: false,
        status: "PENDING_CONFIRMATION",
        resultSummary: description,
      },
    });
    return { toolName, status: "PENDING_CONFIRMATION", resultSummary: description, pendingActionId: log.id };
  }

  try {
    const result = await tool.run(parsed.data, ctx);
    const summary = tool.describeCall?.(parsed.data, ctx) ?? ctx.t("Ran {tool}", { tool: toolName });
    await prisma.aIActionLog.create({
      data: {
        userId: ctx.userId,
        userMessage,
        toolName,
        toolArgsJson: JSON.stringify(parsed.data),
        requiresConfirmation: false,
        wasConfirmed: false,
        status: "SUCCESS",
        resultSummary: summary,
      },
    });
    return { toolName, status: "SUCCESS", resultSummary: summary, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.aIActionLog.create({
      data: {
        userId: ctx.userId,
        userMessage,
        toolName,
        toolArgsJson: JSON.stringify(parsed.data),
        requiresConfirmation: false,
        status: "ERROR",
        resultSummary: message,
      },
    });
    return { toolName, status: "ERROR", resultSummary: message };
  }
}

/** Executes a previously-deferred consequential tool call. Called only from an explicit user confirm click. */
export async function confirmPendingAction(actionLogId: string, ctx: ToolContext): Promise<ToolCallOutcome> {
  const log = await prisma.aIActionLog.findFirst({ where: { id: actionLogId, userId: ctx.userId } });
  if (!log) return { toolName: "unknown", status: "ERROR", resultSummary: "Action not found." };
  if (log.wasConfirmed || log.status !== "PENDING_CONFIRMATION") {
    return { toolName: log.toolName, status: "ERROR", resultSummary: "This action was already resolved." };
  }

  const tool = getTool(log.toolName);
  if (!tool) return { toolName: log.toolName, status: "ERROR", resultSummary: "Tool no longer exists." };

  const parsed = tool.inputSchema.safeParse(JSON.parse(log.toolArgsJson));
  if (!parsed.success) {
    return { toolName: log.toolName, status: "ERROR", resultSummary: "Stored arguments are no longer valid." };
  }

  try {
    const result = await tool.run(parsed.data, ctx);
    await prisma.aIActionLog.update({
      where: { id: log.id },
      data: { wasConfirmed: true, confirmedAt: new Date(), status: "SUCCESS" },
    });
    return { toolName: log.toolName, status: "SUCCESS", resultSummary: log.resultSummary ?? "Done.", data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.aIActionLog.update({ where: { id: log.id }, data: { status: "ERROR" } });
    return { toolName: log.toolName, status: "ERROR", resultSummary: message };
  }
}

export async function rejectPendingAction(actionLogId: string, ctx: ToolContext) {
  const log = await prisma.aIActionLog.findFirst({ where: { id: actionLogId, userId: ctx.userId } });
  if (!log || log.wasConfirmed) return;
  await prisma.aIActionLog.update({ where: { id: log.id }, data: { status: "REJECTED" } });
}

export type { ChatMessage };
