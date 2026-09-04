"use client";

import { useAuth } from "@/context/auth-context";
import { DealRoomAccessGate } from "@/components/deal-room/deal-room-access-gate";
import { ProfileView } from "@/components/account/profile-view";

export default function DealRoomProfilePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return <DealRoomAccessGate isAuthenticated={isAuthenticated} />;
  }

  return <ProfileView />;
}
