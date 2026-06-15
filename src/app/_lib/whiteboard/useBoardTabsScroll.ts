"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BOARD_TAB_SCROLL_EPSILON } from "@/app/_lib/whiteboard/constants";

export function useBoardTabsScroll(activeBoardId: string, totalBoardCount: number, isCreatingBoardName: boolean) {
  const boardTabsScrollRef = useRef<HTMLDivElement>(null);
  const [boardTabsScrollState, setBoardTabsScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
    hasOverflow: false,
  });

  const updateBoardTabsScrollState = useCallback(() => {
    const scrollport = boardTabsScrollRef.current;

    if (!scrollport) {
      setBoardTabsScrollState((current) =>
        current.canScrollLeft || current.canScrollRight || current.hasOverflow
          ? {
              canScrollLeft: false,
              canScrollRight: false,
              hasOverflow: false,
            }
          : current,
      );
      return;
    }

    const maxScrollLeft = Math.max(0, scrollport.scrollWidth - scrollport.clientWidth);
    const hasOverflow = maxScrollLeft > BOARD_TAB_SCROLL_EPSILON;
    const nextState = {
      canScrollLeft: hasOverflow && scrollport.scrollLeft > BOARD_TAB_SCROLL_EPSILON,
      canScrollRight: hasOverflow && scrollport.scrollLeft < maxScrollLeft - BOARD_TAB_SCROLL_EPSILON,
      hasOverflow,
    };

    setBoardTabsScrollState((current) =>
      current.canScrollLeft === nextState.canScrollLeft &&
      current.canScrollRight === nextState.canScrollRight &&
      current.hasOverflow === nextState.hasOverflow
        ? current
        : nextState,
    );
  }, []);

  const scrollBoardTabIntoView = useCallback(
    (boardId: string) => {
      const scrollport = boardTabsScrollRef.current;

      if (!scrollport) {
        return;
      }

      const activeTab = Array.from(scrollport.querySelectorAll<HTMLElement>("[data-board-tab-id]")).find(
        (element) => element.dataset.boardTabId === boardId,
      );

      activeTab?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
      requestAnimationFrame(updateBoardTabsScrollState);
    },
    [updateBoardTabsScrollState],
  );

  const scrollBoardTabs = useCallback(
    (direction: "left" | "right") => {
      const scrollport = boardTabsScrollRef.current;

      if (!scrollport) {
        return;
      }

      scrollport.scrollBy({
        behavior: "smooth",
        left: (direction === "left" ? -1 : 1) * Math.max(120, Math.floor(scrollport.clientWidth * 0.7)),
      });
      requestAnimationFrame(updateBoardTabsScrollState);
    },
    [updateBoardTabsScrollState],
  );

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updateBoardTabsScrollState);
    const scrollport = boardTabsScrollRef.current;

    if (!scrollport) {
      return () => cancelAnimationFrame(frame);
    }

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateBoardTabsScrollState);

    resizeObserver?.observe(scrollport);
    window.addEventListener("resize", updateBoardTabsScrollState);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateBoardTabsScrollState);
    };
  }, [isCreatingBoardName, totalBoardCount, updateBoardTabsScrollState]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollBoardTabIntoView(activeBoardId));

    return () => cancelAnimationFrame(frame);
  }, [activeBoardId, scrollBoardTabIntoView, totalBoardCount]);

  return {
    boardTabsScrollRef,
    boardTabsScrollState,
    scrollBoardTabs,
    updateBoardTabsScrollState,
  };
}
