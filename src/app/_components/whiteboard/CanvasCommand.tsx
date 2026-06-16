"use client";

import { X } from "lucide-react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { CommandState } from "@/app/_lib/whiteboard/types";

export function CanvasCommand({
  command,
  commandInputRef,
  createWidgetFromCommand,
  scale,
  setCommand,
}: {
  command: CommandState;
  commandInputRef: RefObject<HTMLInputElement | null>;
  createWidgetFromCommand: (nextCommand: CommandState) => void;
  scale: number;
  setCommand: Dispatch<SetStateAction<CommandState | null>>;
}) {
  return (
    <form
      className="absolute z-30 flex h-10 w-[17rem] items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--panel-translucent-strong)] px-2.5 shadow-[var(--shadow-popover)] backdrop-blur sm:w-[25rem]"
      data-command-input
      onSubmit={(event) => {
        event.preventDefault();
        createWidgetFromCommand(command);
      }}
      style={{
        left: command.x * scale + 8,
        top: command.y * scale + 8,
      }}
    >
      <span className="select-none text-base font-semibold text-[var(--text-muted)]">/</span>
      <input
        ref={commandInputRef}
        aria-label="Canvas command"
        className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-faint)]"
        onChange={(event) => {
          setCommand((current) =>
            current
              ? {
                  ...current,
                  value: event.target.value,
                }
              : current,
          );
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setCommand(null);
          }
        }}
        placeholder="show burn rate, top contributors, forecast inputs..."
        value={command.value}
      />
      <button
        aria-label="Close command"
        className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--control-hover)]"
        onClick={() => setCommand(null)}
        title="Close"
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
