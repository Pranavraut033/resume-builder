"use client";

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
import {
  exportCoworkPlugin,
  getMcpStdioCommand,
  McpStdioCommand,
} from "@/lib/mcpServer";

const logger = createLogger("SettingsMcpClaudeCode");

const LIST_COMMAND = "claude mcp list";
const REMOVE_COMMAND = "claude mcp remove resume-builder";
const DEV_ADD_COMMAND =
  "claude mcp add resume-builder --scope local -- npm run mcp";

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
    <div className="flex items-center justify-between gap-3">
      <pre className="bg-agent-surface text-agent-on-surface flex-1 overflow-x-auto rounded-lg p-3 text-xs">
        <code>{code}</code>
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
      <div className="flex-1 space-y-2">
        <p className="text-agent-on-surface text-sm font-semibold">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default function SettingsMcpClaudeCodePage() {
  const [stdioCommand, setStdioCommand] = useState<McpStdioCommand | null>(
    null
  );
  const [loaded, setLoaded] = useState(false);
  const [exportingPlugin, setExportingPlugin] = useState(false);
  const { pushToast } = useToast();

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

  const handleExportPlugin = async () => {
    setExportingPlugin(true);
    try {
      const savedPath = await exportCoworkPlugin();
      if (savedPath) {
        pushToast({
          title: "Plugin exported",
          description: savedPath,
          variant: "success",
        });
      }
    } catch (err) {
      logger.error("Error exporting Cowork plugin", { err });
      pushToast({ title: "Couldn't export plugin", variant: "error" });
    } finally {
      setExportingPlugin(false);
    }
  };

  const addCommand = stdioCommand
    ? `claude mcp add resume-builder --scope user --env ${quoteArg(`DATABASE_URL=${stdioCommand.databaseUrl}`)} -- ${quoteArg(stdioCommand.nodePath)} ${quoteArg(stdioCommand.stdioPath)}`
    : DEV_ADD_COMMAND;

  return (
    <div className="text-agent-on-surface min-h-full px-6 py-8">
      <BackButton />
      <div className="mt-4">
        <PageHeader
          title="Connect Claude Code"
          description="Drive this app's resume flows from a Claude Code session, using your existing Claude subscription instead of an API key stored in this app."
        />
      </div>

      <div className="space-y-8">
        <PageSection title="Setup">
          <SurfacePanel stack>
            <Step number={1} title="Enable the MCP server in Settings">
              <p className="text-agent-on-surface-variant text-sm">
                Go back to Settings and turn on the MCP Server toggle first —
                Claude Code connects to the same server the toggle starts.
              </p>
            </Step>

            <Step number={2} title="Register it with Claude Code">
              {loaded && (
                <p className="text-agent-on-surface-variant text-sm">
                  {stdioCommand ? (
                    "Run this once from a terminal, anywhere — it points at this install's own bundled binary, so no repo clone or separate Node install is needed:"
                  ) : (
                    <>
                      No bundled entrypoint found (expected only in a dev
                      build). Run this once from a terminal, in the{" "}
                      <code>resume-builder</code> repo you cloned:
                    </>
                  )}
                </p>
              )}
              <CopyCodeBlock code={addCommand} />
              <p className="text-agent-on-surface-variant text-xs">
                {stdioCommand
                  ? "--scope user registers it for every Claude Code project on this machine. Use --scope local instead to limit it to whatever directory you run this from."
                  : "This registers the server for Claude Code sessions started from this directory (--scope local)."}
              </p>
            </Step>

            <Step number={3} title="Verify the connection">
              <p className="text-agent-on-surface-variant text-sm">
                Confirm Claude Code sees it:
              </p>
              <CopyCodeBlock code={LIST_COMMAND} />
              <p className="text-agent-on-surface-variant text-xs">
                Or run <code>/mcp</code> inside an active Claude Code session.
              </p>
            </Step>

            <Step number={4} title="Try it">
              <p className="text-agent-on-surface-variant text-sm">
                Start a Claude Code session and paste a job posting, e.g.
                &quot;Add this job and tailor my resume to it: &lt;paste job
                description&gt;&quot;. Claude Code will call{" "}
                <code>list_flows</code> and walk the tool chain itself — see{" "}
                <code>skills/resume-mcp/SKILL.md</code> for exactly what it does
                at each step.
              </p>
            </Step>
          </SurfacePanel>
        </PageSection>

        <PageSection title="Cowork (or any other plugin-aware host)">
          <SurfacePanel stack>
            <p className="text-agent-on-surface-variant text-sm">
              Hosts that install MCP servers from a downloaded plugin archive
              (Cowork, Claude Code&apos;s own plugin marketplace) instead of a
              hand-typed command can install this directly: download a
              self-contained <code>udaan.plugin</code> file — the server&apos;s
              command/args/env plus this skill&apos;s runbook — and point the
              host&apos;s plugin installer at it. Same bundled node/stdio.js as
              above, so it only works with this install on this machine.
            </p>
            <Button
              variant="secondary"
              onClick={handleExportPlugin}
              disabled={exportingPlugin || !stdioCommand}
            >
              {exportingPlugin ? "Exporting…" : "Download udaan.plugin"}
            </Button>
            {loaded && !stdioCommand && (
              <p className="text-agent-on-surface-variant text-xs">
                Not available in a dev build — nothing bundled under
                <code> resources/next/mcp/</code> outside a release build.
              </p>
            )}
          </SurfacePanel>
        </PageSection>

        <PageSection title="Troubleshooting">
          <SurfacePanel stack>
            <p className="text-agent-on-surface-variant text-sm">
              <strong className="text-agent-on-surface">
                Claude Code can&apos;t find the tools —
              </strong>{" "}
              check the MCP Server toggle is still on in Settings.{" "}
              {!stdioCommand &&
                "In a dev build, also confirm you registered from inside the resume-builder directory (the fallback command relies on that repo's own npm run mcp script)."}
            </p>
            <p className="text-agent-on-surface-variant text-sm">
              <strong className="text-agent-on-surface">Starting over —</strong>{" "}
              remove the registration and re-add it:
            </p>
            <CopyCodeBlock code={REMOVE_COMMAND} />
            <p className="text-agent-on-surface-variant text-sm">
              For more detail (what data this touches, security posture, the
              Claude Desktop / HTTP alternatives), see <code>docs/MCP.md</code>{" "}
              in the repo.
            </p>
          </SurfacePanel>
        </PageSection>
      </div>
    </div>
  );
}
