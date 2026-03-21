"use client";

import Image from "next/image";
import Link from "next/link";

export type LogoVariant = "light" | "dark";

interface LogoProps {
  variant?: LogoVariant;
  href?: string;
  className?: string;
  responsive?: "navbar" | "hero" | "footer" | "default";
}

const sizePresets = {
  navbar: "h-[60px] w-auto md:h-[72px]",
  hero: "h-12 w-auto md:h-14",
  footer: "h-10 w-auto md:h-12",
  default: "h-8 w-auto md:h-9",
} as const;

/** variant="light" = lys logo på mørk baggrund (logo-dark.svg) | default = mørk logo på lys baggrund (logo-light.svg) */
export function Logo({
  variant,
  href = "/",
  className,
  responsive = "default",
}: LogoProps) {
  const src = variant === "light" ? "/logo-dark.svg" : "/logo-light.svg";
  const sizeClass = sizePresets[responsive];
  const finalClassName = `object-contain transition-opacity duration-200 ${sizeClass} ${className ?? ""}`.trim();

  const img = (
    <Image
      src={src}
      alt="RentLocal"
      width={180}
      height={45}
      className={finalClassName}
      priority
    />
  );

  const content = (
    <span
      className="inline-flex shrink-0 items-center"
      style={{ minWidth: 0 }}
      role="img"
      aria-label="RentLocal logo"
    >
      {img}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="flex shrink-0 items-center">
        {content}
      </Link>
    );
  }

  return content;
}
