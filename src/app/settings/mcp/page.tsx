"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

import {
  BackButton,
  Button,
  PageHeader,
  PageSection,
  SurfacePanel,
} from "@/components/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { createLogger } from "@/lib/logger";
import { getMcpStdioCommand, McpStdioCommand } from "@/lib/mcpServer";

const logger = createLogger("SettingsMcpPage");

const LIST_COMMAND = "claude mcp list";
const REMOVE_COMMAND = "claude mcp remove resume-builder";
const DEV_ADD_COMMAND =
  "claude mcp add resume-builder --scope local -- npm run mcp";
const TUNNEL_COMMAND = "cloudflared tunnel --url http://127.0.0.1:39217";

function quoteArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function CopyCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const { pushToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Error copying command", { err });
      pushToast({ title: "Couldn't copy to clipboard", variant: "error" });
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* min-w-0 matters here: flex-1 alone leaves min-width: auto, so a
          long unbreakable command (an absolute path or two) can't shrink
          below its own content width and pushes the whole page wide —
          overflow-x-auto below never gets the chance to kick in. */}
      <pre className="bg-agent-surface text-agent-on-surface min-w-0 flex-1 overflow-x-auto rounded-lg p-3 text-xs">
        <code className="break-all">{code}</code>
      </pre>
      <Button variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="bg-agent-primary/10 text-agent-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
        {number}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-agent-on-surface text-sm font-semibold">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default function SettingsMcpPage() {
  const [stdioCommand, setStdioCommand] = useState<McpStdioCommand | null>(
    null
  );
  const [loaded, setLoaded] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMcpStdioCommand()
      .then((command) => {
        if (!cancelled) setStdioCommand(command);
      })
      .catch(() => {
        // Expected in a dev build — nothing bundled under
        // resources/next/mcp/ outside a release build. Falls back to the
        // repo-checkout dev workflow below.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addCommand = stdioCommand
    ? `claude mcp add resume-builder --scope user --env ${quoteArg(`DATABASE_URL=${stdioCommand.databaseUrl}`)} -- ${quoteArg(stdioCommand.nodePath)} ${quoteArg(stdioCommand.stdioPath)}`
    : DEV_ADD_COMMAND;

  return (
    <div className="text-agent-on-surface min-h-full">
      <BackButton />
      <div className="mt-4">
        <PageHeader
          title="Connect an AI assistant"
          description="Let an AI assistant you already use — such as Claude Code, Claude Desktop, Codex, or another MCP-compatible tool — read and edit your resumes here. Everything runs on your machine; nothing is uploaded."
        />
      </div>

      <div className="space-y-8">
        <PageSection title="Easiest: download the connector">
          <SurfacePanel>
            <p className="text-agent-on-surface-variant text-sm leading-relaxed">
              For assistants that install from a downloaded file (Claude
              Code&apos;s plugin marketplace, Cowork, and similar), head back to{" "}
              <Link href="/settings" className="text-agent-primary underline">
                Settings
              </Link>{" "}
              and use <strong>Download connector</strong> in the MCP Server
              section — one file, no typing required.
            </p>
          </SurfacePanel>
        </PageSection>

        <PageSection title="Manual setup">
          <SurfacePanel stack>
            <Step number={1} title="Turn on the MCP server in Settings">
              <p className="text-agent-on-surface-variant text-sm">
                Your AI assistant connects to the same local server that toggle
                starts.
              </p>
            </Step>

            <Step number={2} title="Register it with your assistant">
              {loaded && (
                <p className="text-agent-on-surface-variant text-sm">
                  {stdioCommand
                    ? "If your assistant uses the claude CLI, run this once from a terminal — it points at this install's own bundled files, so nothing else needs to be installed:"
                    : "No bundled entrypoint found (expected only in a dev build). Run this once from a terminal, inside the resume-builder folder you cloned:"}
                </p>
              )}
              <CopyCodeBlock code={addCommand} />
              <p className="text-agent-on-surface-variant text-xs">
                {stdioCommand
                  ? "This registers it for every project on this machine. Swap --scope user for --scope local to limit it to one folder."
                  : "This registers the server for sessions started from this folder."}{" "}
                Other assistants usually take the same information as a config
                file instead — expand the server toggle in Settings for that
                format.
              </p>
            </Step>

            <Step number={3} title="Confirm it worked">
              <p className="text-agent-on-surface-variant text-sm">
                If your assistant uses the claude CLI:
              </p>
              <CopyCodeBlock code={LIST_COMMAND} />
              <p className="text-agent-on-surface-variant text-xs">
                Or ask your assistant to list its available tools — it should
                mention resume or job-related ones.
              </p>
            </Step>

            <Step number={4} title="Try it">
              <p className="text-agent-on-surface-variant text-sm">
                Start a session with your assistant and paste a job posting,
                e.g. &quot;Add this job and tailor my resume to it: &lt;paste
                job description&gt;&quot;. It will take it from there.
              </p>
            </Step>
          </SurfacePanel>
        </PageSection>

        <PageSection title="Troubleshooting">
          <SurfacePanel stack>
            <p className="text-agent-on-surface-variant text-sm">
              <strong className="text-agent-on-surface">
                Your assistant can&apos;t find the tools —
              </strong>{" "}
              check the MCP Server toggle is still on in Settings.{" "}
              {!stdioCommand &&
                "In a dev build, also confirm you registered from inside the resume-builder folder — the fallback command relies on that folder's own npm run mcp script."}
            </p>
            <p className="text-agent-on-surface-variant text-sm">
              <strong className="text-agent-on-surface">Starting over —</strong>{" "}
              remove the registration and re-add it:
            </p>
            <CopyCodeBlock code={REMOVE_COMMAND} />
          </SurfacePanel>
        </PageSection>

        <PageSection title="Advanced">
          <SurfacePanel stack>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="text-agent-primary text-left text-sm underline"
            >
              {advancedOpen ? "Hide" : "Show"} using this with claude.ai
              (browser)
            </button>
            {advancedOpen && (
              <div className="space-y-3">
                <p className="text-agent-on-surface-variant text-sm leading-relaxed">
                  The steps above connect apps running on your own computer.
                  claude.ai in a browser can&apos;t reach a server on your
                  machine at all — its custom connectors are fetched by
                  Anthropic&apos;s servers, not by your browser, so there is no
                  setting here that changes that.
                </p>
                <p className="text-agent-on-surface-variant text-sm leading-relaxed">
                  The only way around it is to expose your local server to the
                  internet with a tunneling tool, for example:
                </p>
                <CopyCodeBlock code={TUNNEL_COMMAND} />
                <p className="text-agent-error text-sm font-medium">
                  Do this only if you understand the risk: the tunnel URL gives
                  anyone who has it full read/write access to your resume data,
                  with no password. Turn the tunnel off as soon as you&apos;re
                  done, and prefer a desktop or CLI assistant instead whenever
                  you can.
                </p>
              </div>
            )}
          </SurfacePanel>
        </PageSection>
      </div>
    </div>
  );
}
