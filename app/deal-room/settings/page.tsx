"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { AccountView } from "@/components/account/account-view";

export default function DealRoomSettingsPage() {
  const { isQualified, isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isQualified) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return <AccountView />;
}
