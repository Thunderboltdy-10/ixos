"use client";

import { cn } from "@/lib/utils";

const STREAM_ROWS = [42, 66, 58, 78, 52, 70, 61, 83];

export function StreamWaterfall({
  isActive,
  isComplete,
}: {
  isActive: boolean;
  isComplete: boolean;
}) {
  const show = isActive || isComplete;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={cn(
          "space-y-2 pr-[4.5rem]",
          show
            ? isActive
              ? "animate-[streamTicker_2.6s_linear_infinite]"
              : "animate-[streamTicker_5.8s_linear_infinite]"
            : "opacity-38"
        )}
      >
        {[...STREAM_ROWS, ...STREAM_ROWS].map((width, index) => (
          <div key={`stream-${index}`} className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", index % 2 === 0 ? "bg-accent-teal/78" : "bg-fg-muted/36")} />
            <div className="h-2.5 flex-1 rounded-sm bg-white/[0.05]">
              <div
                className={cn("h-full rounded-sm", index % 2 === 0 ? "bg-accent-teal/64" : "bg-white/20")}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-bg-graphite-2/95 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-bg-graphite-2/95 to-transparent" />

      <div className="pointer-events-none absolute bottom-2 right-0 top-2 w-16 overflow-hidden">
        <div className={cn("space-y-1 text-[8px] font-mono leading-tight", show ? "opacity-100" : "opacity-34", isActive ? "animate-[streamTextTicker_2.7s_linear_infinite]" : "animate-[streamTextTicker_5.8s_linear_infinite]")}>
          {[
            "q4_report.pdf",
            "review_q1.pptx",
            "notes_sync.md",
            "nda_final.pdf",
            "roadmap_v2.docx",
            "invoice_jan.xlsx",
            "meeting_log.txt",
            "deck_final.pptx",
          ].map((line, idx) => (
            <div key={`stream-line-${idx}`} className={cn(idx % 2 === 0 ? "text-accent-teal/74" : "text-fg-muted/52")}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes streamTicker {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes streamTextTicker {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
