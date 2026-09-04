"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { AccountView } from "@/components/account/account-view";

export default function DealRoomSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="dashboard-panel p-8">
        <div className="dashboard-skeleton h-8 w-40 mb-4" />
        <div className="dashboard-skeleton h-4 w-full mb-2" />
        <div className="dashboard-skeleton h-4 w-2/3" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return <AccountView />;
}
