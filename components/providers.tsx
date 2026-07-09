"use client";

import { DemoPersonaProvider } from "@/context/demo-persona-context";
import { ProjectStoreProvider } from "@/context/project-store-context";
import { LeadCaptureProvider } from "@/context/lead-capture-context";
import { TaxonomyStoreProvider } from "@/context/taxonomy-store-context";
import { SiteSettingsProvider } from "@/context/site-settings-context";
import { DealRoomStoreProvider } from "@/context/deal-room-store-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DemoPersonaProvider>
      <SiteSettingsProvider>
        <TaxonomyStoreProvider>
          <ProjectStoreProvider>
            <LeadCaptureProvider>
              <DealRoomStoreProvider>
                {children}
                <Toaster position="top-right" richColors />
              </DealRoomStoreProvider>
            </LeadCaptureProvider>
          </ProjectStoreProvider>
        </TaxonomyStoreProvider>
      </SiteSettingsProvider>
    </DemoPersonaProvider>
  );
}
