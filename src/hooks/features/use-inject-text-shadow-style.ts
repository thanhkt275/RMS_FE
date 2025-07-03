import { useEffect } from "react";

export function useInjectTextShadowStyle() {
  useEffect(() => {
    const styleId = "audience-text-shadow-style";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .text-shadow-xl {
          text-shadow: 0 0 10px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.3);
        }
      `;
      document.head.appendChild(styleEl);
      return () => {
        if (document.getElementById(styleId)) {
          document.head.removeChild(styleEl);
        }
      };
    }
  }, []);
}
