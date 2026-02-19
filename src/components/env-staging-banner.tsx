"use client";

import { useTranslations } from "@/lib/i18n";

/**
 * Staging / test environment banner.
 * Shown only when NEXT_PUBLIC_IS_STAGING is set (e.g. Vercel Preview env).
 * In production this var is unset, so the banner is never rendered.
 */
export function EnvStagingBanner() {
  const t = useTranslations("env");
  const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

  if (!isStaging) return null;

  return (
    <div
      className="sticky top-0 z-[100] w-full bg-red-600 text-white px-4 py-3 text-center font-semibold text-lg shadow-md"
      role="status"
      aria-live="polite"
    >
      {t("stagingBanner")}
    </div>
  );
}
