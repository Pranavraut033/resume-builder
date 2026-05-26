"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronRightIcon } from "lucide-react";

import { useJobPageContext } from "@/contexts/JobPageContext";

import { Button, Icon } from "../ui";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = {
  // No props needed for now, but this can be extended in the future if necessary
};

const DownloadButton: React.FC<Props> = ({}) => {
  const {
    onPDFExport,
    onTXTExport,
    onCopyText,
    isExportingPdf,
    isExportingTxt,
  } = useJobPageContext();

  return (
    <Menu as="div" className="relative w-full">
      {/* Default action — left pill half */}
      <div className="flex w-full gap-0.5">
        <Button
          onClick={onPDFExport}
          disabled={isExportingPdf}
          className="w-full rounded-l-full!"
        >
          {isExportingPdf ? "Generating PDF…" : "Download PDF"}
        </Button>
        <MenuButton className="bg-agent-primary hover:bg-agent-primary-fixed text-agent-on-primary flex items-center rounded-l-lg rounded-r-full px-3 py-2 focus:outline-none">
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </MenuButton>
      </div>

      <MenuItems className="w-ful border-agent-outline-variant bg-agent-surface-high shadow-agent-card absolute right-0 z-10 mt-2 origin-top-right overflow-hidden rounded-xl border py-1 ring-1 ring-black/5 focus:outline-none">
        <MenuItem>
          {({}) => (
            <Button
              variant="ghost"
              onClick={onTXTExport}
              className="w-full justify-start rounded-none shadow-none"
              disabled={isExportingTxt}
            >
              <Icon name="FileTypeCorner" className="mr-2 h-4 w-4" />
              {isExportingTxt ? "Generating TXT…" : "Download Word (TXT)"}
            </Button>
          )}
        </MenuItem>

        <MenuItem>
          {({}) => (
            <Button
              variant="ghost"
              onClick={onCopyText}
              className="w-full justify-start rounded-none shadow-none"
            >
              <Icon
                name="Clipboard"
                strokeWidth={2.5}
                className="mr-2 h-4 w-4"
              />
              Copy Text to Clipboard
            </Button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  );
};

export default DownloadButton;
