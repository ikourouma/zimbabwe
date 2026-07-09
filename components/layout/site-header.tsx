"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { PersonaSwitcher } from "@/components/shared/persona-switcher";
import { platformName } from "@/content/zimbabwe-site";

const navLinks = [
  { label: "Opportunity", href: "/opportunity" },
  { label: "Platform Concept", href: "/platform" },
  { label: "Strategic Pillars", href: "/strategic-alignment" },
  { label: "Priority Sectors", href: "/sectors" },
  { label: "Project Registry", href: "/projects" },
  { label: "Afronovation", href: "/about-afronovation" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{ backgroundColor: "var(--color-nav-bg)", borderBottom: "1px solid var(--color-nav-border)" }}
    >
      <div className="page-container flex h-16 lg:h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <Image
            src="/brand/zimbabwe-map-icon.png"
            alt="Republic of Zimbabwe"
            width={44}
            height={44}
            className="object-contain w-10 h-10 lg:w-11 lg:h-11 transition-transform group-hover:scale-105"
          />
          <div>
            <p className="section-overline leading-none mb-0.5 text-[0.7rem]">{platformName.overline}</p>
            <p className="font-semibold text-base lg:text-lg leading-tight text-white" style={{ letterSpacing: "-0.01em" }}>
              {platformName.short}
            </p>
          </div>
        </Link>

        <nav
          className="hidden xl:flex items-center gap-1 flex-1 min-w-0 overflow-hidden mx-3"
          aria-label="Primary navigation"
        >
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <PersonaSwitcher />
          <Link href="/register" className="btn-sovereign hidden sm:inline-flex whitespace-nowrap text-xs px-5 py-2.5">
            Register
          </Link>
          <button
            type="button"
            className="xl:hidden p-2 rounded text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="xl:hidden page-container pb-4" style={{ borderTop: "1px solid var(--color-nav-border)" }}>
          <div className="pt-3 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-item block" onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/register" className="btn-sovereign block text-center mt-3" onClick={() => setMobileOpen(false)}>
              Register
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
