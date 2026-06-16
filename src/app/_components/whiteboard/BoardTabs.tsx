"use client";

import { ChevronLeft, ChevronRight, Plus, Sparkles, X } from "lucide-react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { boardEmoji } from "@/app/_lib/whiteboard/geometry";
import type { CanvasBoard } from "@/lib/dashboard-schemas";

type BoardTabsScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  hasOverflow: boolean;
};

export function BoardTabs({
  activeBoardId,
  boardNameDraft,
  boardNameInputRef,
  boardTabsScrollRef,
  boardTabsScrollState,
  cancelBoardNameCreate,
  createNamedBlankBoard,
  deleteBoard,
  isCreatingBoardName,
  openAiBoardCreate,
  openBoardNameCreate,
  personalBoards,
  prebuiltBoards,
  scrollBoardTabs,
  selectBoard,
  setBoardNameDraft,
  updateBoardTabsScrollState,
}: {
  activeBoardId: string;
  boardNameDraft: string;
  boardNameInputRef: RefObject<HTMLInputElement | null>;
  boardTabsScrollRef: RefObject<HTMLDivElement | null>;
  boardTabsScrollState: BoardTabsScrollState;
  cancelBoardNameCreate: () => void;
  createNamedBlankBoard: () => void;
  deleteBoard: (boardId: string) => void;
  isCreatingBoardName: boolean;
  openAiBoardCreate: () => void;
  openBoardNameCreate: () => void;
  personalBoards: CanvasBoard[];
  prebuiltBoards: CanvasBoard[];
  scrollBoardTabs: (direction: "left" | "right") => void;
  selectBoard: (boardId: string) => void;
  setBoardNameDraft: Dispatch<SetStateAction<string>>;
  updateBoardTabsScrollState: () => void;
}) {
  return (
    <div className="absolute left-8 right-36 top-4 z-50 flex items-center gap-2 rounded-md border border-[var(--border-medium)] bg-[var(--panel-translucent)] px-2 py-1.5 text-sm font-medium shadow-sm backdrop-blur sm:left-14 sm:right-40 sm:top-6">
      <span className="flex shrink-0 items-baseline gap-1 text-sm">
        <span className="font-semibold text-[var(--text-primary)]">AI</span>
        <span className="font-medium text-[var(--text-muted)]">Whiteboards</span>
      </span>
      <span className="h-4 w-px shrink-0 bg-[var(--border-strong)]" />
      <div className="relative min-w-0 flex-1">
        {boardTabsScrollState.hasOverflow ? (
          <>
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-[var(--panel)] via-[var(--panel-translucent-strong)] to-transparent transition-opacity duration-150 ${
                boardTabsScrollState.canScrollLeft ? "opacity-100" : "opacity-0"
              }`}
            />
            <button
              aria-label="Scroll whiteboards left"
              className={`absolute inset-y-0 left-0 z-20 grid w-5 place-items-center rounded-sm text-[var(--text-muted)] transition duration-150 hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] ${
                boardTabsScrollState.canScrollLeft
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              disabled={!boardTabsScrollState.canScrollLeft}
              onClick={() => scrollBoardTabs("left")}
              tabIndex={boardTabsScrollState.canScrollLeft ? 0 : -1}
              title="Scroll whiteboards left"
              type="button"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          </>
        ) : null}
        <div
          ref={boardTabsScrollRef}
          className="flex min-w-0 flex-1 scroll-px-8 items-center gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={updateBoardTabsScrollState}
        >
          <div className="flex shrink-0 items-center gap-1">
            {prebuiltBoards.map((board) => {
              const isActive = board.id === activeBoardId;

              return (
                <button
                  aria-pressed={isActive}
                  className={`relative flex h-8 shrink-0 items-center justify-center gap-1.5 px-2.5 text-sm font-semibold leading-none transition focus:outline-none focus-visible:outline-none ${
                    isActive
                      ? "text-[var(--text-primary)] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-[var(--board-founder-accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  data-board-tab-id={board.id}
                  key={board.id}
                  onClick={() => selectBoard(board.id)}
                  title={board.name}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-4 w-4 shrink-0 place-items-center text-[15px] leading-none"
                  >
                    {boardEmoji(board.id)}
                  </span>
                  <span className="min-w-0 truncate leading-none">{board.name}</span>
                </button>
              );
            })}
          </div>
          <span className="h-5 w-px shrink-0 bg-[var(--border-medium)]" />
          <div className="flex shrink-0 items-center gap-1">
            {personalBoards.map((board) => {
              const isActive = board.id === activeBoardId;
              const canDelete = personalBoards.length > 1;

              return (
                <div
                  className={`group relative flex h-8 shrink-0 items-center text-sm font-semibold leading-none transition ${
                    isActive
                      ? "text-[var(--text-primary)] after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-[var(--board-founder-accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  data-board-tab-id={board.id}
                  key={board.id}
                  title={board.name}
                >
                  <button
                    aria-pressed={isActive}
                    className="flex h-full max-w-40 items-center justify-center gap-1.5 px-2.5 text-inherit focus:outline-none focus-visible:outline-none"
                    onClick={() => selectBoard(board.id)}
                    type="button"
                  >
                    <span className="min-w-0 truncate leading-none">{board.name}</span>
                  </button>
                  {canDelete ? (
                    <button
                      aria-label={`Delete ${board.name} whiteboard`}
                      className="absolute right-0 top-1/2 z-10 grid h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 place-items-center text-[var(--text-muted)] opacity-0 transition hover:text-[var(--text-primary)] group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteBoard(board.id);
                      }}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        {boardTabsScrollState.hasOverflow ? (
          <>
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-gradient-to-l from-[var(--panel)] via-[var(--panel-translucent-strong)] to-transparent transition-opacity duration-150 ${
                boardTabsScrollState.canScrollRight ? "opacity-100" : "opacity-0"
              }`}
            />
            <button
              aria-label="Scroll whiteboards right"
              className={`absolute inset-y-0 right-0 z-20 grid w-5 place-items-center rounded-sm text-[var(--text-muted)] transition duration-150 hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)] ${
                boardTabsScrollState.canScrollRight
                  ? "opacity-100"
                  : "pointer-events-none opacity-0"
              }`}
              disabled={!boardTabsScrollState.canScrollRight}
              onClick={() => scrollBoardTabs("right")}
              tabIndex={boardTabsScrollState.canScrollRight ? 0 : -1}
              title="Scroll whiteboards right"
              type="button"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </>
        ) : null}
      </div>
      {isCreatingBoardName ? (
        <form
          className="flex h-8 shrink-0 items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            createNamedBlankBoard();
          }}
        >
          <input
            aria-label="New whiteboard name"
            className="h-8 w-36 rounded border border-[var(--border-strong)] bg-[var(--panel)] px-2 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--focus-border)]"
            maxLength={48}
            onChange={(event) => setBoardNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelBoardNameCreate();
              }
            }}
            placeholder="Name"
            ref={boardNameInputRef}
            value={boardNameDraft}
          />
          <button
            className="h-8 rounded border border-[var(--primary)] bg-[var(--primary)] px-2.5 text-sm font-semibold leading-none text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:border-[var(--border-strong)] disabled:bg-[var(--disabled-bg)] disabled:text-[var(--disabled-text)]"
            disabled={!boardNameDraft.trim()}
            type="submit"
          >
            Create
          </button>
          <button
            className="h-8 rounded border border-transparent px-2.5 text-sm font-semibold leading-none text-[var(--text-muted)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
            onClick={cancelBoardNameCreate}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded border border-[var(--border)] px-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
            onClick={openAiBoardCreate}
            title="Create with AI"
            type="button"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Create with AI</span>
          </button>
          <button
            aria-label="Create blank whiteboard"
            className="grid h-8 w-8 place-items-center rounded border border-transparent text-[var(--text-secondary)] transition hover:border-[var(--border)] hover:bg-[var(--control-hover)] hover:text-[var(--text-primary)]"
            onClick={openBoardNameCreate}
            title="Create blank whiteboard"
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
