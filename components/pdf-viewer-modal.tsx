"use client";

import { useState, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Download, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Source } from "@/lib/api";

interface PDFViewerModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PDFViewerModal({ source, isOpen, onClose }: PDFViewerModalProps) {
  const initialPage = source?.page ? parseInt(source.page) || 1 : 1;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [loading, setLoading] = useState<boolean>(true);

  // Build the PDF URL using our proxy endpoint
  const getPdfUrl = useCallback(() => {
    if (!source?.storage_path) {
      // Fallback to document_url if no storage_path
      return source?.document_url?.split("#")[0] || null;
    }
    // Use our proxy endpoint
    return `/api/documents/pdf?path=${encodeURIComponent(source.storage_path)}`;
  }, [source?.storage_path, source?.document_url]);

  const pdfUrl = getPdfUrl();

  // Reset state when source changes
  useEffect(() => {
    if (source) {
      setCurrentPage(parseInt(source.page) || 1);
      setLoading(true);
    }
  }, [source?.ref]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          setCurrentPage((prev) => Math.max(1, prev - 1));
          break;
        case "ArrowRight":
          setCurrentPage((prev) => prev + 1);
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleIframeLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const handleOpenExternal = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  if (!source) return null;

  // Build URL with page anchor
  const pdfUrlWithPage = pdfUrl ? `${pdfUrl}#page=${currentPage}` : "";

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-4 md:inset-8 z-50 flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <div>
                <Dialog.Title className="font-semibold text-sm">
                  {source.document}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">
                  Citation {source.ref} - Page {currentPage}
                </Dialog.Description>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Page Navigation */}
              <div className="flex items-center gap-1 px-2 border-r border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="h-8 w-8 p-0"
                  title="Previous page (←)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-16 text-center">
                  Page {currentPage}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="h-8 w-8 p-0"
                  title="Next page (→)"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Open External */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenExternal}
                className="h-8 w-8 p-0"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              {/* Download */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0"
                title="Download PDF"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Close */}
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 relative bg-muted/30">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>Loading PDF...</span>
                </div>
              </div>
            )}

            {pdfUrl ? (
              <iframe
                key={pdfUrlWithPage}
                src={pdfUrlWithPage}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                title={`PDF Viewer - ${source.document}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                <p className="text-muted-foreground">PDF URL not available</p>
                <Button onClick={handleOpenExternal} disabled={!source.document_url}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Original URL
                </Button>
              </div>
            )}

            {/* Citation Location Indicator */}
            {currentPage === initialPage && source.char_offset_start !== undefined && !loading && (
              <CitationIndicator
                charOffsetStart={source.char_offset_start}
                charOffsetEnd={source.char_offset_end}
              />
            )}
          </div>

          {/* Footer with content preview */}
          <div className="px-4 py-3 border-t border-border bg-muted/50">
            <div className="flex items-start gap-3">
              <div className="w-1 h-full min-h-[40px] bg-red-500 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Look for this text on page {initialPage}:
                </p>
                <p className="text-sm text-foreground leading-relaxed line-clamp-3 font-medium">
                  &quot;{source.content_preview}&quot;
                </p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Citation indicator - shows a pulsing red arrow on the left side
 */
function CitationIndicator({
  charOffsetStart,
  charOffsetEnd,
}: {
  charOffsetStart: number;
  charOffsetEnd?: number;
}) {
  // Estimate vertical position based on character offset
  const avgCharsPerLine = 80;
  const estimatedLine = Math.floor(charOffsetStart / avgCharsPerLine);

  // Convert to percentage (assuming ~50 lines per page)
  const topPercent = Math.min(85, Math.max(10, (estimatedLine / 50) * 100 + 15));

  // Calculate height based on content length
  const contentLength = (charOffsetEnd || charOffsetStart + 200) - charOffsetStart;
  const estimatedLines = Math.ceil(contentLength / avgCharsPerLine);
  const heightPercent = Math.min(25, Math.max(8, estimatedLines * 2));

  return (
    <div
      className="absolute left-0 z-20 pointer-events-none"
      style={{
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
      }}
    >
      {/* Pulsing red bar */}
      <div
        className="absolute left-0 w-2 h-full bg-red-500 rounded-r-sm animate-pulse"
        style={{
          boxShadow: "0 0 12px rgba(239, 68, 68, 0.8), 0 0 24px rgba(239, 68, 68, 0.4)",
        }}
      />
      {/* Arrow pointing right */}
      <div
        className="absolute left-2 top-1/2 -translate-y-1/2 w-0 h-0 animate-pulse"
        style={{
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          borderLeft: "14px solid rgb(239, 68, 68)",
          filter: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.8))",
        }}
      />
    </div>
  );
}
