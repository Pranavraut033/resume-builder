import { readFileSync } from "fs";
import path from "path";

import {
  BackButton,
  PageHeader,
  PageSection,
  SurfacePanel,
} from "@/components/ui";

import { MarkdownBlock } from "./MarkdownBlock";

// Statically prerendered: the two files below are read once at build time
// and inlined into the route, so the packaged Tauri app (which serves Next
// from $APPDATA, not this repo checkout) never needs them on disk at
// runtime.
export const dynamic = "force-static";

const license = readFileSync(path.join(process.cwd(), "LICENSE"), "utf-8");
const thirdPartyLicense = readFileSync(
  path.join(process.cwd(), "LICENSE-THIRD-PARTY.md"),
  "utf-8"
);

export default function LicensesPage() {
  return (
    <div className="text-agent-on-surface min-h-full py-8">
      <BackButton />
      <div className="mt-4">
        <PageHeader
          title="Licenses"
          description="Udaan's own license, and attribution for the open-source work it builds on."
        />
      </div>

      <div className="space-y-8">
        <PageSection title="License">
          <SurfacePanel>
            {/* Plain MIT text with hard line breaks — rendering it through
                the markdown pipeline collapses those into run-on
                paragraphs, so this one is preformatted instead. */}
            <pre className="text-agent-on-surface-variant font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {license}
            </pre>
          </SurfacePanel>
        </PageSection>

        <PageSection title="Third-Party Licenses">
          <SurfacePanel>
            <MarkdownBlock content={thirdPartyLicense} />
          </SurfacePanel>
        </PageSection>
      </div>
    </div>
  );
}
