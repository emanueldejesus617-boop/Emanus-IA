import React from "react";
import Image from "next/image";

/**
 * Logótipo Emanus IA
 * Suporta alternância automática entre o Modo Light e Modo Dark.
 */

type LogoVariant = "splash" | "sidebar" | "topbar" | "custom";

const VARIANT_STYLES: Record<
  Exclude<LogoVariant, "custom">,
  { height: number; width: number }
> = {
  splash:  { height: 48, width: 262 },
  sidebar: { height: 36, width: 196 },
  topbar:  { height: 28, width: 153 },
};

interface LogoProps {
  className?: string;
  variant?: LogoVariant;
  height?: number;
  width?: number;
  /** Compatibilidade com props legadas */
  iconSize?: number;
  textSize?: string;
  showText?: boolean;
  showIcon?: boolean;
}

export function Logo({
  className = "",
  variant = "custom",
  height: heightProp,
  width: widthProp,
  iconSize: iconSizeProp,
}: LogoProps) {
  let height = 36;
  let width = 196;

  if (variant !== "custom") {
    height = VARIANT_STYLES[variant].height;
    width = VARIANT_STYLES[variant].width;
  } else {
    height = heightProp || (iconSizeProp ? Math.round(iconSizeProp * 0.8) : 36);
    width = widthProp || Math.round(height * 5.46);
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* Imagem para o Modo Light (Texto Escuro adaptado a fundos claros) */}
      <Image
        src="/logo-emanus-light.png"
        alt="Emanus IA"
        width={width}
        height={height}
        style={{ height: `${height}px`, width: "auto" }}
        className="object-contain block dark:hidden"
        unoptimized
        priority
      />
      {/* Imagem para o Modo Dark (Texto Branco adaptado a fundos escuros) */}
      <Image
        src="/logo-emanus-dark.png"
        alt="Emanus IA"
        width={width}
        height={height}
        style={{ height: `${height}px`, width: "auto" }}
        className="object-contain hidden dark:block"
        unoptimized
        priority
      />
    </div>
  );
}
