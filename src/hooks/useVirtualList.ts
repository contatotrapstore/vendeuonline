import { useState, useMemo, useCallback } from "react";

interface UseVirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem<T> {
  index: number;
  data: T;
  style: React.CSSProperties;
}

export function useVirtualList<T>(
  items: T[],
  options: UseVirtualListOptions
): {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  containerProps: React.HTMLAttributes<HTMLDivElement>;
} {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
    const totalHeight = items.length * itemHeight;

    return { startIndex, endIndex, totalHeight };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const virtualItems = useMemo(() => {
    const visibleItems: VirtualItem<T>[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        visibleItems.push({
          index: i,
          data: items[i],
          style: {
            position: "absolute",
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          },
        });
      }
    }

    return visibleItems;
  }, [startIndex, endIndex, items, itemHeight]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const targetScrollTop = Math.max(0, index * itemHeight);
      setScrollTop(targetScrollTop);
    },
    [itemHeight]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const containerProps = {
    style: {
      height: containerHeight,
      overflowY: "auto" as const,
      position: "relative" as const,
    },
    onScroll: handleScroll,
  };

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    containerProps,
  };
}
