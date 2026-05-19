// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import { useState } from "react";

import { useJobPageContext } from "@/contexts/JobPageContext";

import EditorLayout from "./EditorLayout";
// import { ResumeChatAssistant } from "./resume/ResumeChatAssistant";
import { ResumeSectionNav, SectionId } from "./resume/ResumeSectionNav";
import { SectionEditor } from "./resume/SectionEditor";
import { TemplateRenderer } from "./templates/TemplateRenderer";

function ResumeEditor() {
  const { customization, resume, saveToDb } = useJobPageContext();

  const [activeSection, setActiveSection] = useState<SectionId>("personal");

  const preview = (
    <TemplateRenderer resume={resume} customization={customization} />
  );

  return (
    <EditorLayout
      title=""
      description=""
      onSave={() => saveToDb("resume", resume, customization)}
      leftSection={
        <ResumeSectionNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      }
      livePreviewContent={preview}
      exportContent={preview}
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
  );
  {
    /*
      {activeTab === "edit" && (
        <ResumeChatAssistant
          resume={resume}
          onApplyResume={handleResumeChange}
        />
      )} */
  }
}

export default ResumeEditor;
