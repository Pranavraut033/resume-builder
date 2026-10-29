"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { downloadBlob } from "@/lib/pdfExport";

import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  blob: Blob | null;
  loading: boolean;
  error?: string;
  filename: string;
}

let workerConfigured = false;

/**
 * Previews the exact export blob page-by-page on canvases via pdf.js, so what
 * the user sees is what Download writes.
 */
export function PdfPreviewModal({
  open,
  onClose,
  blob,
  loading,
  error,
  filename,
}: PdfPreviewModalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Load the document from the blob.
  useEffect(() => {
    if (!open || !blob) return;

    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!workerConfigured) {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
          workerConfigured = true;
        }
        const data = new Uint8Array(await blob.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        loaded = doc;
        setRenderError(null);
        setPdfDoc(doc);
      } catch (err) {
        if (!cancelled) {
          setRenderError(
            err instanceof Error ? err.message : "Failed to render PDF"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      setPdfDoc(null);
      if (loaded) void loaded.destroy();
    };
  }, [open, blob]);

  // Render every page once the document and the container are available.
  useEffect(() => {
    if (!pdfDoc || !container) return;

    let cancelled = false;
    const tasks: RenderTask[] = [];
    const cssWidth = container.clientWidth || 800;
    const dpr = window.devicePixelRatio || 1;

    (async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) return;
        try {
          const page = await pdfDoc.getPage(i);
          const canvas = canvasRefs.current[i - 1];
          if (cancelled || !canvas) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: (cssWidth * dpr) / base.width,
          });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const context = canvas.getContext("2d");
          if (!context) continue;
          const task = page.render({ canvasContext: context, viewport });
          tasks.push(task);
          await task.promise;
        } catch (err) {
          // Cancelled render tasks reject with RenderingCancelledException.
          if (cancelled) return;
          setRenderError(
            err instanceof Error ? err.message : "Failed to render PDF"
          );
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
      tasks.forEach((task) => task.cancel());
    };
  }, [pdfDoc, container]);

  const displayError = error ?? renderError;
  const numPages = pdfDoc?.numPages ?? 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="PDF preview"
      size="xl"
      cancelLabel="Close"
      primaryAction={blob ? () => downloadBlob(blob, filename) : undefined}
      primaryActionLabel="Download"
    >
      <div className="bg-agent-surface-container min-h-64 rounded-md p-4">
        <div ref={setContainer} className="flex flex-col items-center gap-4">
          {displayError ? (
            <p className="text-agent-on-surface-variant text-sm" role="alert">
              {displayError}
            </p>
          ) : loading || !pdfDoc ? (
            <p className="text-agent-on-surface-variant flex items-center gap-2 text-sm">
              <Icon name="spinner" className="h-4 w-4 animate-spin" />
              Rendering preview...
            </p>
          ) : (
            Array.from({ length: numPages }, (_, i) => (
              <canvas
                key={i}
                ref={(el) => {
                  canvasRefs.current[i] = el;
                }}
                className="h-auto w-full bg-white shadow-md"
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
