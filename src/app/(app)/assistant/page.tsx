import { requireUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai/provider";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export default async function AssistantPage() {
  await requireUser();
  const provider = getAIProvider();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-3">
        <h1 className="text-lg font-semibold text-foreground">AI Assistant</h1>
        <p className="text-sm text-muted">Answers using your real project data through controlled tools — nothing is sent without your confirmation.</p>
      </div>
      <div className="min-h-0 flex-1">
        <AssistantChat isLive={provider.isLive} />
      </div>
    </div>
  );
}
