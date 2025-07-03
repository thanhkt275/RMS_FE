"use client";

import { useState, useEffect } from "react";

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window exists (client-side)
    if (typeof window === "undefined") return;

    // Initial check
    setIsMobile(window.innerWidth < 1024);

    // Handle resize
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile };
}
