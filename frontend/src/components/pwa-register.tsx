"use client";

import { useEffect } from "react";

/**
 * Regista o Service Worker de forma silenciosa para que o navegador
 * exiba o botão nativo de instalação diretamente na barra de endereço (URL).
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.debug("Service worker registration:", err);
        });
      });
    }
  }, []);

  return null;
}
