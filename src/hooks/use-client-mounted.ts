"use client";

import { useEffect, useState } from "react";

/** False on SSR and the first client paint so Base UI `useId` is not in the hydrate tree. */
export function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
