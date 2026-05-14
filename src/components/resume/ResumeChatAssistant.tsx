// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";

// import { SelectedModelCard } from "@/components/SelectedModelCard";
// import { Button } from "@/components/ui";
// import { Icon } from "@/components/ui/Icon";
// import { useAIContext } from "@/contexts/AIContext";
// import { useResumeEditContext } from "@/contexts/ResumeEditContext";
// import LLMService, { ResumeChatEditResult } from "@/lib/llm/llmService";
// import { ResumeJSON } from "@/types/resume";

// interface ResumeChatAssistantProps {
//   resume: ResumeJSON;
//   onApplyResume: (resume: ResumeJSON) => Promise<void> | void;
// }

// interface ChatMessage {
//   id: string;
//   role: "user" | "assistant";
//   content: string;
//   time: string;
// }

// const QUICK_REQUESTS = [
//   "Rewrite my summary to match this JD without adding new claims.",
//   "Tighten experience bullets for ATS keywords from the JD.",
//   "Reorder skills by JD relevance and remove weak items.",
// ];

// function createMessage(
//   role: ChatMessage["role"],
//   content: string
// ): ChatMessage {
//   return {
//     id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
//     role,
//     content,
//     time: new Date().toLocaleTimeString(),
//   };
// }

// export function ResumeChatAssistant({
//   resume,
//   onApplyResume,
// }: ResumeChatAssistantProps) {
//   const { selectedModel, selectedProvider, temperature } = useAIContext();
//   const { job } = useResumeEditContext();

//   const [messages, setMessages] = useState<ChatMessage[]>([
//     createMessage(
//       "assistant",
//       "Ask for specific resume edits. I will only improve existing information and never invent details."
//     ),
//   ]);
//   const [input, setInput] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isOpen, setIsOpen] = useState(true);
//   const [showModelSelector, setShowModelSelector] = useState(false);
//   const [pendingResult, setPendingResult] =
//     useState<ResumeChatEditResult | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement | null>(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({
//       behavior: "smooth",
//       block: "end",
//     });
//   }, [messages, isLoading]);

//   const canSend = useMemo(() => {
//     return (
//       !!input.trim() && !!selectedProvider && !!selectedModel && !isLoading
//     );
//   }, [input, selectedProvider, selectedModel, isLoading]);

//   const submitRequest = async (requestText: string) => {
//     const trimmed = requestText.trim();
//     if (!trimmed || !selectedProvider || !selectedModel) return;

//     setError(null);
//     setIsLoading(true);
//     setPendingResult(null);
//     setMessages((prev) => [...prev, createMessage("user", trimmed)]);
//     console.log({
//       selectedModel,
//       selectedProvider,
//     });

//     try {
//       const result = await LLMService.editResumeFromChat(
//         resume,
//         job?.details ?? null,
//         job?.description,
//         trimmed,
//         {
//           provider: selectedProvider,
//           model: selectedModel,
//           temperature,
//         }
//       );

//       const assistantText = [
//         result.result.assistantReply,
//         result.result.changeSummary.length > 0
//           ? `\nPlanned edits:\n- ${result.result.changeSummary.join("\n- ")}`
//           : "",
//         result.result.rejectedRequests.length > 0
//           ? `\nRejected requests:\n- ${result.result.rejectedRequests.join("\n- ")}`
//           : "",
//       ]
//         .filter(Boolean)
//         .join("\n");

//       setMessages((prev) => [
//         ...prev,
//         createMessage("assistant", assistantText),
//       ]);
//       setPendingResult(result.result);
//       setInput("");
//     } catch (e) {
//       const message =
//         e instanceof Error
//           ? e.message
//           : "Failed to process AI edit request. Please try again.";
//       setError(message);
//       setMessages((prev) => [
//         ...prev,
//         createMessage(
//           "assistant",
//           "I could not generate a safe edit just now. Please try a more specific request."
//         ),
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="pointer-events-none absolute right-4 bottom-0 z-40 pb-6 sm:right-6 sm:bottom-6">
//       {!isOpen && (
//         <button
//           type="button"
//           className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-xl"
//           style={{
//             background:
//               "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
//             color: "var(--color-agent-on-primary)",
//           }}
//           onClick={() => setIsOpen(true)}
//         >
//           <Icon name="sparkles" className="h-4 w-4" />
//           Resume AI Chat
//         </button>
//       )}

//       {isOpen && (
//         <section className="border-agent-outline-variant from-agent-surface-container to-agent-surface pointer-events-auto flex h-[min(76vh,680px)] w-[min(460px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border bg-linear-180 shadow-2xl">
//           <div
//             className="flex items-center justify-between gap-3 border-b px-4 py-3"
//             style={{ borderColor: "var(--color-agent-outline-variant)" }}
//           >
//             <div>
//               <p
//                 className="text-xs font-semibold tracking-[0.14em] uppercase"
//                 style={{ color: "var(--color-agent-primary)" }}
//               >
//                 AI Chat Editor
//               </p>
//               <p
//                 className="mt-1 text-xs"
//                 style={{ color: "var(--color-agent-on-surface-variant)" }}
//               >
//                 {selectedProvider || "No provider"} /{" "}
//                 {selectedModel || "No model"}
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 type="button"
//                 className="rounded-lg p-1.5"
//                 style={{ color: "var(--color-agent-on-surface-variant)" }}
//                 onClick={() => setShowModelSelector((prev) => !prev)}
//                 title="Model selection"
//               >
//                 <Icon name="settings" className="h-4 w-4" />
//               </button>
//               <button
//                 type="button"
//                 className="rounded-lg p-1.5"
//                 style={{ color: "var(--color-agent-on-surface-variant)" }}
//                 onClick={() => setIsOpen(false)}
//                 title="Minimize"
//               >
//                 <Icon name="x" className="h-4 w-4" />
//               </button>
//             </div>
//           </div>

//           {showModelSelector && (
//             <div
//               className="max-h-64 overflow-y-auto border-b p-3"
//               style={{ borderColor: "var(--color-agent-outline-variant)" }}
//             >
//               <SelectedModelCard />
//             </div>
//           )}

//           <div
//             className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
//             style={{ background: "var(--color-agent-surface-low)" }}
//           >
//             {messages.map((message) => (
//               <div
//                 key={message.id}
//                 className={`rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
//                   message.role === "user" ? "ml-8" : "mr-8"
//                 }`}
//                 style={
//                   message.role === "user"
//                     ? {
//                         background: "var(--color-agent-primary-container)",
//                         color: "var(--color-agent-on-primary-container)",
//                       }
//                     : {
//                         background: "var(--color-agent-surface-container)",
//                         color: "var(--color-agent-on-surface)",
//                       }
//                 }
//               >
//                 <div className="mb-1 flex items-center gap-2 text-[11px] opacity-70">
//                   <span>{message.role === "user" ? "You" : "Assistant"}</span>
//                   <span>{message.time}</span>
//                 </div>
//                 {message.content}
//               </div>
//             ))}
//             {isLoading && (
//               <div
//                 className="mr-8 flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
//                 style={{
//                   background: "var(--color-agent-surface-container)",
//                   color: "var(--color-agent-on-surface)",
//                 }}
//               >
//                 <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />
//                 Thinking through safe edits...
//               </div>
//             )}
//             <div ref={messagesEndRef} />
//           </div>

//           <div
//             className="border-t px-3 py-3"
//             style={{ borderColor: "var(--color-agent-outline-variant)" }}
//           >
//             <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
//               {QUICK_REQUESTS.map((item) => (
//                 <button
//                   key={item}
//                   type="button"
//                   onClick={() => setInput(item)}
//                   className="shrink-0 rounded-full border px-3 py-1 text-xs transition-colors"
//                   style={{
//                     borderColor: "var(--color-agent-outline-variant)",
//                     color: "var(--color-agent-on-surface-variant)",
//                   }}
//                 >
//                   {item}
//                 </button>
//               ))}
//             </div>

//             <div className="flex gap-2">
//               <textarea
//                 value={input}
//                 onChange={(event) => setInput(event.target.value)}
//                 placeholder="Ask: rewrite summary, tighten bullets, reorder skills..."
//                 className="min-h-19 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
//                 style={{
//                   borderColor: "var(--color-agent-outline-variant)",
//                   background: "var(--color-agent-surface)",
//                   color: "var(--color-agent-on-surface)",
//                 }}
//               />
//               <Button
//                 variant="primary"
//                 onClick={() => submitRequest(input)}
//                 disabled={!canSend}
//                 className="self-end"
//               >
//                 Send
//               </Button>
//             </div>

//             {error && (
//               <p className="mt-2 text-xs text-red-500" role="alert">
//                 {error}
//               </p>
//             )}

//             {pendingResult && (
//               <div
//                 className="mt-3 rounded-xl border p-3"
//                 style={{
//                   borderColor: "var(--color-agent-outline-variant)",
//                   background: "var(--color-agent-surface-container-low)",
//                 }}
//               >
//                 <p
//                   className="text-xs font-medium"
//                   style={{ color: "var(--color-agent-on-surface)" }}
//                 >
//                   Review ready
//                 </p>
//                 <p
//                   className="mt-1 text-xs"
//                   style={{ color: "var(--color-agent-on-surface-variant)" }}
//                 >
//                   Apply these validated updates to your resume when ready.
//                 </p>
//                 <div className="mt-3 flex gap-2">
//                   <Button
//                     variant="primary"
//                     size="sm"
//                     onClick={() => onApplyResume(pendingResult.updatedResume)}
//                   >
//                     Apply Changes
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => setPendingResult(null)}
//                   >
//                     Discard
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </section>
//       )}
//     </div>
//   );
// }
