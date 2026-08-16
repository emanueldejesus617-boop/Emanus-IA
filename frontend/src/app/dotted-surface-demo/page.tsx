"use client";
import React from "react";
import { DottedSurface } from "@/components/ui/dotted-surface";

export default function DottedSurfaceDemoPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-dark overflow-hidden font-sans">
      {/* ThreeJS Dotted Wave Surface Background */}
      <DottedSurface />

      {/* Glassmorphic Central Card */}
      <div className="relative z-10 max-w-xl w-full mx-4 p-8 md:p-12 rounded-2xl bg-surface/40 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-6">
        {/* Animated Badge */}
        <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary/20 text-primary border border-primary/30 animate-pulse">
          Dotted Surface Activo
        </span>

        {/* Premium Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text via-primary to-text">
          Ondas de Aprendizagem
        </h1>

        {/* Description */}
        <p className="text-muted text-sm md:text-base leading-relaxed max-w-md">
          Esta superfície tridimensional interactiva simula ondas e partículas,
          representando o fluxo de conhecimento na plataforma educacional Emanus IA.
        </p>

        {/* Buttons / CTA */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/80 text-dark font-medium transition duration-300 shadow-lg shadow-primary/20"
          >
            Voltar ao Dashboard
          </button>
          <a
            href="/sparkles-demo"
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-text border border-white/10 font-medium transition duration-300 backdrop-blur-sm"
          >
            Ver Sparkles Demo
          </a>
        </div>
      </div>

      {/* Subtle Bottom Ambient Light */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  );
}
