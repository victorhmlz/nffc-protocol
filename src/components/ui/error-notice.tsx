import { AlertTriangle, XCircle } from "lucide-react";
import { ERROR_VOCABULARY, type ErrorCode, type ErrorTone } from "@domain/errors/errors";
import { cn } from "@/lib/cn";

const TONE_ICON: Record<ErrorTone, typeof AlertTriangle> = {
  critical: XCircle,
  warning: AlertTriangle,
};

const TONE_CLASS: Record<ErrorTone, string> = {
  critical: "border-status-critical/30 bg-status-critical/10 text-status-critical",
  warning: "border-status-warning/30 bg-status-warning/10 text-foreground",
};

export interface ErrorNoticeProps {
  readonly code: ErrorCode;
  readonly className?: string;
}

/**
 * The one rendering of the unified error vocabulary (TASK-33,
 * `docs/spec/07-ux-map.md` §7) — every write-flow error surface in this
 * codebase renders this instead of a raw wallet/RPC message. Sibling to
 * `TransactionStatus` (icon + label + description, never colour alone); a
 * `"critical"` tone always ends the current action (nothing else to show), a
 * `"warning"` tone means data is still shown alongside the notice.
 */
export function ErrorNotice({ code, className }: ErrorNoticeProps) {
  const entry = ERROR_VOCABULARY[code];
  const Icon = TONE_ICON[entry.tone];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-start gap-3 rounded-md border p-3",
        TONE_CLASS[entry.tone],
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{entry.message}</span>
        <span className="text-xs opacity-90">{entry.recoveryAction}</span>
      </div>
    </div>
  );
}
