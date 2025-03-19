"use client";

import { useState, useEffect } from "react";

export default function useAuthenticate() {
  const [authKey, setAuthKey] = useState<string | null | undefined>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedAuthKey = sessionStorage.getItem("key");
      setAuthKey(storedAuthKey ?? undefined);
    }
  }, []);

  return authKey;
}
