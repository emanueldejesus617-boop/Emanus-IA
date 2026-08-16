"use client";
import React from "react";
import { SparklesCore } from "@/components/ui/sparkles";

/**
 * SparklesPreview — Demonstração do componente Sparkles com gradiente
 * indigo/sky e partículas brancas sobre fundo escuro.
 */
export function SparklesPreview() {
  return (
    <div className="h-[40rem] w-full bg-dark flex flex-col items-center justify-center overflow-hidden rounded-md">
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-text relative z-20">
        Emanus IA
      </h1>
      <div className="w-full max-w-[40rem] h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-primary to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-secondary to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-secondary to-transparent h-px w-1/4" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-dark [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
      </div>
    </div>
  );
}

/**
 * SparklesPreviewDark — Partículas em ecrã inteiro com fundo slate escuro.
 * Ideal para Hero Sections ou Landing Pages.
 */
export function SparklesPreviewDark() {
  return (
    <div className="h-[40rem] relative w-full bg-surface flex flex-col items-center justify-center overflow-hidden rounded-md">
      <div className="w-full absolute inset-0 h-full">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FFFFFF"
          speed={1}
        />
      </div>
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-text relative z-20">
        Build faster
      </h1>
    </div>
  );
}

/**
 * SparklesPreviewColorful — Partículas verdes (cor primária do Emanus IA)
 * com texto em gradiente. Perfeito para ecrãs de conquista/gamificação.
 */
export function SparklesPreviewColorful() {
  return (
    <div className="h-[40rem] relative w-full bg-dark flex flex-col items-center justify-center overflow-hidden rounded-md">
      <div className="w-full absolute inset-0 h-full">
        <SparklesCore
          id="tsparticlescolorful"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#00C896"
          speed={0.5}
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-4 relative z-20">
        <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-text to-muted">
          The Future
        </h1>
        <p className="text-muted cursor-default text-center">
          is brighter than you think
        </p>
      </div>
    </div>
  );
}
