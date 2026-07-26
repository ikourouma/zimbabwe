"use client";

import { AuthProvider } from "@/context/auth-context";
import { AuthTransitionProvider } from "@/context/auth-transition-context";
import { LocaleProvider } from "@/context/locale-context";
import { ProjectStoreProvider } from "@/context/project-store-context";
import { LeadCaptureProvider } from "@/context/lead-capture-context";
import { TaxonomyStoreProvider } from "@/context/taxonomy-store-context";
import { SiteSettingsProvider } from "@/context/site-settings-context";
import { DealRoomStoreProvider } from "@/context/deal-room-store-context";
import { AuthTransitionOverlay } from "@/components/auth/auth-transition-overlay";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <AuthTransitionProvider>
          <SiteSettingsProvider>
            <TaxonomyStoreProvider>
              <ProjectStoreProvider>
                <LeadCaptureProvider>
                  <DealRoomStoreProvider>
                    <TooltipProvider delayDuration={150}>
                      {children}
                      <AuthTransitionOverlay />
                      <Toaster position="top-right" richColors />
                    </TooltipProvider>
                  </DealRoomStoreProvider>
                </LeadCaptureProvider>
              </ProjectStoreProvider>
            </TaxonomyStoreProvider>
          </SiteSettingsProvider>
        </AuthTransitionProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
