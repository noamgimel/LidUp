import { useRef, useEffect } from 'react';

export function useScrollSync() {
  const ref = useRef(null);
  const topScrollRef = useRef(null);

  useEffect(() => {
    const el1 = ref.current;
    const el2 = topScrollRef.current;

    if (!el1 || !el2) return;

    let isSyncing1 = false;
    let isSyncing2 = false;

    const syncScroll1 = () => {
      if (!isSyncing1) {
        isSyncing2 = true;
        el2.scrollLeft = el1.scrollLeft;
      }
      isSyncing1 = false;
    };

    const syncScroll2 = () => {
      if (!isSyncing2) {
        isSyncing1 = true;
        el1.scrollLeft = el2.scrollLeft;
      }
      isSyncing2 = false;
    };

    el1.addEventListener('scroll', syncScroll1);
    el2.addEventListener('scroll', syncScroll2);

    return () => {
      el1.removeEventListener('scroll', syncScroll1);
      el2.removeEventListener('scroll', syncScroll2);
    };
  }, []);

  return { ref, topScrollRef };
}