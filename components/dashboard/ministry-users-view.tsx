"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus, Users as UsersIcon } from "lucide-react";
import type { AdminUserRecord } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { AccessGate } from "@/components/dashboard/access-gate";
import { CreateUserModal } from "@/components/dashboard/create-user-modal";
import { DataTable } from "@/components/dashboard/data-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ROLE_LABELS } from "@/components/dashboard/role-change-modal";
import { formatAccountRef } from "@/lib/utils/account-ref";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<AdminUserRecord["accountStatus"], string> = {
  active: "Active",
  suspended: "Suspended",
  pending: "Pending",
  deactivated: "Deactivated",
};

const STATUS_COLOR: Record<AdminUserRecord["accountStatus"], string> = {
  active: "#4ade80",
  suspended: "#f87171",
  pending: "#fde047",
  deactivated: "#9ca3af",
};

type StatusFilterValue = "all" | AdminUserRecord["accountStatus"];

const STATUS_FILTER_CHIPS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: STATUS_LABELS.active },
  { value: "suspended", label: STATUS_LABELS.suspended },
  { value: "pending", label: STATUS_LABELS.pending },
  { value: "deactivated", label: STATUS_LABELS.deactivated },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs uppercase tracking-wide shrink-0" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="text-sm text-right min-w-0 truncate" style={{ color: "var(--color-text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Ministry Admin's scoped "Create User" console (Platform Feedback Batch v3, Phase 1) — mirrors
 * /admin/users's CreateUserModal, but deliberately narrower: a ministry_admin sees and creates only
 * `government`-role staff force-locked to their own ministryId (see assignableRoles() and POST
 * /api/users/create). No role-change/suspend actions here yet — that's the platform-wide Users &
 * Roles console's job; this page is about instant provisioning of one's own ministry desk staff.
 *
 * Fix Ministry Admin Console Access (Part 3): brought up to parity with every other list in the
 * platform — DataTable (search for free), status filter pills with live counts, and a lightweight
 * read-only detail drawer on row click. Deliberately NOT a reuse of the full admin UserDetailDrawer
 * — that component is tightly coupled to admin-only write actions (role/status change, ministry
 * rebind) and a dossier API scoped to admin/super_admin; retrofitting it for a read-only ministry
 * view would be a materially bigger change than this consistency fix warrants.
 */
export function MinistryUsersView() {
  const { isMinistryAdmin, isLoading: authLoading, ministryId } = useAuth();
  const { ministries } = useTaxonomyStore();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  const ministry = ministries.find((m) => m.id === ministryId);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ministry/users");
      if (res.ok) setUsers(await res.json());
    } catch {
      /* keep last-known list on transient failure */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const countFor = useCallback(
    (value: StatusFilterValue) => (value === "all" ? users.length : users.filter((u) => u.accountStatus === value).length),
    [users]
  );

  const filteredUsers = useMemo(
    () => (statusFilter === "all" ? users : users.filter((u) => u.accountStatus === statusFilter)),
    [users, statusFilter]
  );

  const columns = useMemo<ColumnDef<AdminUserRecord, unknown>[]>(
    () => [
      {
        accessorKey: "accountSeq",
        header: "Account",
        cell: ({ row }) => <span className="font-mono text-xs text-white/70">{formatAccountRef(row.original.accountSeq)}</span>,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="text-white">{row.original.name}</span>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <span style={{ color: "var(--color-text-secondary)" }}>{row.original.email}</span>,
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <span style={{ color: "var(--color-text-secondary)" }}>{ROLE_LABELS[row.original.role] ?? row.original.role}</span>,
      },
      {
        accessorKey: "accountStatus",
        header: "Status",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[row.original.accountStatus] }} />
            <span style={{ color: "var(--color-text-secondary)" }}>{STATUS_LABELS[row.original.accountStatus]}</span>
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span style={{ color: "var(--color-text-muted)" }}>{new Date(row.original.createdAt).toLocaleDateString()}</span>
        ),
      },
    ],
    []
  );

  if (!authLoading && !isMinistryAdmin) {
    return (
      <AccessGate
        title="Sign in required"
        description="Use a Ministry Admin account to manage your ministry's staff accounts."
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {ministry ? `${ministry.name} — ` : ""}staff accounts you have created for your ministry desk.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!ministryId}>
          <UserPlus className="h-3.5 w-3.5" />
          Create user
        </Button>
      </div>

      {!ministryId && !authLoading && (
        <div
          className="mb-6 rounded-lg p-4 text-sm"
          style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "var(--color-text-secondary)" }}
        >
          No ministry is assigned to your account yet. Contact a Platform/ZIDA Admin to complete your setup before
          creating staff accounts.
        </div>
      )}

      {users.length === 0 && !isLoading ? (
        <div className="dashboard-panel p-10 text-center">
          <UsersIcon className="h-8 w-8 mx-auto mb-3 opacity-40" style={{ color: "var(--color-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            No staff accounts yet. Create your first ministry desk user to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_FILTER_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatusFilter(chip.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  statusFilter === chip.value
                    ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/40"
                    : "text-[var(--color-text-muted)] border-[var(--color-sovereign-border)] hover:bg-white/5 hover:text-white"
                )}
              >
                {chip.label} ({countFor(chip.value)})
              </button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={filteredUsers}
            isLoading={isLoading}
            searchPlaceholder="Search by name, email, or account ID..."
            emptyMessage="No staff accounts match this filter."
            onRowClick={(row) => setSelectedUser(row)}
            getRowId={(row) => row.userId}
          />
        </>
      )}

      <CreateUserModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
        lockedRole="government"
        lockedMinistryId={ministryId ? { id: ministryId, label: ministry?.name ?? ministry?.shortName ?? "Your ministry" } : undefined}
      />

      <Sheet open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedUser && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="status-badge status-badge-active">{ROLE_LABELS[selectedUser.role] ?? selectedUser.role}</span>
                  <span className="status-badge" style={{ color: STATUS_COLOR[selectedUser.accountStatus] }}>
                    {STATUS_LABELS[selectedUser.accountStatus]}
                  </span>
                  <span className="text-[11px] font-mono ml-auto" style={{ color: "var(--color-text-muted)" }}>
                    {formatAccountRef(selectedUser.accountSeq)}
                  </span>
                </div>
                <SheetTitle>{selectedUser.name}</SheetTitle>
                <SheetDescription>{selectedUser.email}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 divide-y" style={{ borderColor: "var(--color-sovereign-border)" }}>
                <InfoRow label="Role" value={ROLE_LABELS[selectedUser.role] ?? selectedUser.role} />
                <InfoRow label="Status" value={STATUS_LABELS[selectedUser.accountStatus]} />
                <InfoRow label="Ministry" value={ministry?.name ?? "—"} />
                <InfoRow label="Job Title" value={selectedUser.jobTitle ?? "—"} />
                <InfoRow label="Phone" value={selectedUser.phone ?? "—"} />
                <InfoRow label="Created" value={new Date(selectedUser.createdAt).toLocaleDateString()} />
              </div>

              <p className="mt-4 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Read-only — role, status, and ministry changes are managed by ZIDA&apos;s Users &amp; Roles console.
              </p>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
