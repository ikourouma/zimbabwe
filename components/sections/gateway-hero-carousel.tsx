"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/context/locale-context";
import { useSiteStats } from "@/lib/hooks/use-site-stats";
import type { HomeHeroContent, HomeHeroSlide } from "@/lib/types";

export function GatewayHeroCarousel() {
  const { locale, messages: t } = useLocale();
  // Phase 1 marketing CMS override (Super Admin → Settings → Page Content) — English only for
  // now; other locales keep showing their translated defaults until this is extended.
  const [override, setOverride] = useState<HomeHeroSlide[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/content-blocks/home-hero")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { body?: HomeHeroContent } | null) => {
        const slides = data?.body?.slides;
        if (!cancelled && slides && slides.length > 0) setOverride(slides);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const gatewaySlides = override && locale === "en" ? override : t.gatewaySlides;
  const [activeSlide, setActiveSlide] = useState(0);
  const slideCount = gatewaySlides.length;
  const siteStats = useSiteStats();
  const countryStats = [
    { value: String(siteStats.totalProjects), label: t.home.heroCountryStats[0].label },
    { value: String(siteStats.sectorCount), label: t.home.heroCountryStats[1].label },
    { value: String(siteStats.publishedProjects), label: t.home.heroCountryStats[2].label },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slideCount);
    }, 8000);
    return () => clearInterval(timer);
  }, [slideCount]);

  const slide = gatewaySlides[activeSlide];

  return (
    <section className="relative min-h-[auto] sm:min-h-[90vh] flex flex-col items-center justify-start overflow-hidden mesh-gradient-hero">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10 page-container w-full pt-16 sm:pt-20 md:pt-24 lg:pt-28">
        <div className="min-h-0 sm:min-h-[600px] flex items-start justify-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={
                slide.id === "country"
                  ? "w-full flex flex-col md:flex-row items-center justify-between gap-12 text-left"
                  : "text-center w-full max-w-4xl mx-auto flex flex-col items-center"
              }
            >
              {slide.id !== "country" && (
                <div
                  className="mb-8 inline-flex items-center justify-center p-3 rounded-2xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <Image
                    src="/brand/zimbabwe-map-icon.png"
                    alt="Zimbabwe"
                    width={64}
                    height={64}
                    className="object-contain"
                    priority
                    sizes="64px"
                  />
                </div>
              )}

              <div className={slide.id === "country" ? "flex-1" : "w-full"}>
                <h2 className="section-overline hero-overline mb-4 tracking-[0.2em] text-balance" style={{ color: "var(--color-gold)" }}>
                  {slide.overline}
                </h2>
                <h1
                  className="font-light mb-6 text-white"
                  style={{
                    fontSize: "var(--type-display-size)",
                    letterSpacing: "var(--type-display-tracking)",
                    lineHeight: "var(--type-display-leading)",
                  }}
                >
                  {slide.headline}
                </h1>
                {"highlight" in slide && slide.highlight && (
                  <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-zim-accent-pale)" }}>
                    {slide.highlight}
                  </p>
                )}
                <p
                  className="text-lg leading-relaxed mb-10 max-w-2xl"
                  style={{ color: "var(--color-text-secondary)", margin: slide.id === "country" ? undefined : "0 auto 2.5rem" }}
                >
                  {slide.description}
                </p>

                {slide.id === "country" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 border-y border-white/5 py-8">
                    {countryStats.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-3xl font-light font-mono text-white mb-2">{stat.value}</p>
                        <p className="text-[0.65rem] uppercase tracking-widest font-semibold" style={{ color: "var(--color-gold)" }}>
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`flex flex-col sm:flex-row gap-4 ${slide.id === "country" ? "" : "justify-center items-center w-full"}`}>
                  <Link href={slide.primaryCta.href} className="btn-sovereign px-7 py-3.5 text-sm">
                    {slide.primaryCta.label}
                  </Link>
                  <Link href={slide.secondaryCta.href} className="btn-sovereign-ghost px-7 py-3.5 text-sm">
                    {slide.secondaryCta.label}
                  </Link>
                </div>
              </div>

              {slide.id === "country" && (
                <div className="flex-1 hidden lg:flex justify-center">
                  <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden border border-white/5 p-8 flex flex-col justify-center items-center text-center">
                    <Image
                      src="/brand/zimbabwe-map-icon.png"
                      alt="Zimbabwe map"
                      width={96}
                      height={96}
                      className="object-contain mb-6 opacity-90"
                      sizes="96px"
                    />
                    <h4 className="text-xl font-bold text-white mb-2">ZIDA 2025 Catalogue</h4>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      {countryStats[0].value} projects across {countryStats[1].value} sectors — pending official validation.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-20">
        <div className="flex gap-3">
          {gatewaySlides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSlide(i)}
              className={`h-2 rounded-full transition-all duration-500 ${activeSlide === i ? "w-8 bg-[var(--color-gold)]" : "w-2 bg-white/20 hover:bg-white/40"}`}
              aria-label={`View slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
