"use client";

import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

interface UseLeonardoListKeyboardOptions<T extends { id: string }> {
  /** Abilita j/k e frecce quando l'elenco è visibile o la scheda è aperta */
  enabled: boolean;
  items: T[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Navigazione tastiera standard elenchi Leonardo: j/↓ successivo, k/↑ precedente. */
export function useLeonardoListKeyboard<T extends { id: string }>({
  enabled,
  items,
  activeId,
  onSelect,
}: UseLeonardoListKeyboardOptions<T>) {
  useEffect(() => {
    if (!enabled || items.length === 0) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const ids = items.map((item) => item.id);
      const currentIndex = activeId ? ids.indexOf(activeId) : -1;

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex =
          currentIndex < 0 ? 0 : Math.min(currentIndex + 1, ids.length - 1);
        onSelect(ids[nextIndex]!);
        return;
      }

      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        const prevIndex =
          currentIndex < 0 ? ids.length - 1 : Math.max(currentIndex - 1, 0);
        onSelect(ids[prevIndex]!);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, items, activeId, onSelect]);
}
