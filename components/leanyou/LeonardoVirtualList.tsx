"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface LeonardoVirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
}

export function LeonardoVirtualList<T>({
  items,
  itemHeight,
  height,
  overscan = 6,
  className = "",
  renderItem,
  getKey,
}: LeonardoVirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    setScrollTop(node.scrollTop);
  }, []);

  useEffect(() => {
    setScrollTop(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [items.length]);

  const { start, end, paddingTop, paddingBottom } = useMemo(() => {
    const total = items.length;
    if (total === 0) {
      return { start: 0, end: 0, paddingTop: 0, paddingBottom: 0 };
    }

    const visibleCount = Math.ceil(height / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      total,
      startIndex + visibleCount + overscan * 2
    );

    return {
      start: startIndex,
      end: endIndex,
      paddingTop: startIndex * itemHeight,
      paddingBottom: Math.max(0, (total - endIndex) * itemHeight),
    };
  }, [items.length, itemHeight, height, scrollTop, overscan]);

  const slice = items.slice(start, end);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`overflow-y-auto ${className}`}
      style={{ height }}
    >
      <div style={{ paddingTop, paddingBottom }}>
        {slice.map((item, index) => (
          <div key={getKey(item, start + index)} style={{ height: itemHeight }}>
            {renderItem(item, start + index)}
          </div>
        ))}
      </div>
    </div>
  );
}
