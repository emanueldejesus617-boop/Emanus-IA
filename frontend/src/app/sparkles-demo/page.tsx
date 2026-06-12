"use client";
import React from "react";
import {
  SparklesPreview,
  SparklesPreviewDark,
  SparklesPreviewColorful,
} from "@/components/ui/demo";

export default function SparklesDemoPage() {
  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center space-y-12 py-20">
      {/* Demo 1 — Gradiente com texto central */}
      <div className="w-full max-w-6xl mx-auto border border-surface rounded-xl overflow-hidden">
        <SparklesPreview />
      </div>

      {/* Demo 2 — Partículas full-page (fundo escuro) */}
      <div className="w-full max-w-6xl mx-auto border border-surface rounded-xl overflow-hidden">
        <SparklesPreviewDark />
      </div>

      {/* Demo 3 — Partículas coloridas (cor primária EMAIT) */}
      <div className="w-full max-w-6xl mx-auto border border-surface rounded-xl overflow-hidden">
        <SparklesPreviewColorful />
      </div>
    </div>
  );
}
