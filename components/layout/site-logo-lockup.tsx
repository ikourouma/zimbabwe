"use client";

import Image from "next/image";
import { useTranslations } from "@/context/locale-context";

type SiteLogoLockupProps = {
  iconClassName?: string;
  iconSize?: number;
  priority?: boolean;
};

export function SiteLogoLockup({
  iconClassName = "object-contain w-10 h-10 lg:w-11 lg:h-11",
  iconSize = 44,
  priority = false,
}: SiteLogoLockupProps) {
  const t = useTranslations();

  return (
    <>
      <Image
        src="/brand/zimbabwe-map-icon.png"
        alt={t.footer.logoAlt}
        width={iconSize}
        height={iconSize}
        className={iconClassName}
        priority={priority}
        sizes={`${iconSize}px`}
      />
      <div className="min-w-0">
        <p className="site-logo-overline">{t.platformName.headerOverline}</p>
        <p className="site-logo-title">{t.platformName.shortHeader}</p>
      </div>
    </>
  );
}
