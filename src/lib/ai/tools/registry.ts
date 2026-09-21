import type { ToolDefinition } from "@/lib/ai/types";
import {
  getProjectsTool,
  getProjectTool,
  getTasksTool,
  getTodayTasksTool,
  getWeekContextTool,
  getWaitingItemsTool,
  findFreeTimeTool,
} from "@/lib/ai/tools/reads";
import { createTaskTool, updateTaskTool, completeTaskTool, createEmailDraftTool } from "@/lib/ai/tools/writes";
import { sendEmailDraftTool, applyWeeklyPlanTool } from "@/lib/ai/tools/confirmed";

export const ALL_TOOLS: ToolDefinition[] = [
  getProjectsTool,
  getProjectTool,
  getTasksTool,
  getTodayTasksTool,
  getWeekContextTool,
  getWaitingItemsTool,
  findFreeTimeTool,
  createTaskTool,
  updateTaskTool,
  completeTaskTool,
  createEmailDraftTool,
  sendEmailDraftTool,
  applyWeeklyPlanTool,
] as unknown as ToolDefinition[];

export function getTool(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
