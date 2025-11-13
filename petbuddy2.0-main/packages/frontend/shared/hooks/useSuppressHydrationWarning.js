import { useEffect, useState } from "react";

export function useSuppressHydrationWarning() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
