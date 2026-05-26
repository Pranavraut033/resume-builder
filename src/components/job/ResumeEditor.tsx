"use client";

import { useState } from "react";

import { useJobPageContext } from "@/contexts/JobPageContext";

import { ChatFAB } from "../chat";
import { ChatContextProvider } from "../chat/ChatContext";
import { ResumeSectionNav, SectionId } from "./resume/ResumeSectionNav";
import { SectionEditor } from "./resume/SectionEditor";
import { TemplateRenderer } from "./templates/TemplateRenderer";

import { EditorLayout } from ".";

function ResumeEditor() {
  const { customization, resume } = useJobPageContext();

  const [activeSection, setActiveSection] = useState<SectionId>("personal");

  const preview = (
    <TemplateRenderer resume={resume} customization={customization} />
  );

  return (
    <ChatContextProvider>
      <EditorLayout
        title=""
        description=""
        leftSection={
          <ResumeSectionNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        }
        templateRenderer={preview}
        mainSection={
          <main
            className="flex min-w-0 flex-1 flex-col overflow-y-auto"
            style={{ background: "var(--color-agent-surface-low)" }}
          >
            <div className="min-h-full px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
              <div className="mx-auto w-full max-w-4xl">
                <SectionEditor section={activeSection} />
              </div>
            </div>
          </main>
        }
      />
      <ChatFAB />
    </ChatContextProvider>
  );
}

export default ResumeEditor;
