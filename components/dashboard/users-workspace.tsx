"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, MoreHorizontal, ShieldCheck, UserPlus, UserX, Users as UsersIcon } from "lucide-react";
import type { AdminUserRecord } from "@/lib/types";
import type { AccountRole } from "@/lib/auth/types";
import { useAuth } from "@/context/auth-context";
import { useTaxonomyStore } from "@/context/taxonomy-store-context";
import { useAdminUsers } from "@/lib/hooks/use-admin-users";
import { assignableRoles, canManageTarget } from "@/lib/auth/user-governance";
import {
  DEFAULT_USER_COMPLIANCE_FILTERS,
  matchesUserRow,
  type RoleFilter,
  type StatusFilter,
  type UserComplianceFilters,
} from "@/lib/governance/user-directory-filters";
import { AccessGate } from "@/components/dashboard/access-gate";
import { DataTable } from "@/components/dashboard/data-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { UserDirectoryFiltersBar } from "@/components/dashboard/user-directory-filters";
import { Button } from "@/components/ui/button";
import { RoleChangeModal, ROLE_LABELS } from "@/components/dashboard/role-change-modal";
import { AccountStatusModal, type AccountStatusAction } from "@/components/dashboard/account-status-modal";
import { formatAccountRef } from "@/lib/utils/account-ref";
import { UserDetailDrawer } from "@/components/dashboard/user-detail-drawer";
import { InviteUserModal } from "@/components/dashboard/invite-user-modal";
import { CreateUserModal } from "@/components/dashboard/create-user-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export type UsersWorkspaceTier = "super-admin" | "admin";

/**
 * Shared Users & Roles workspace, mounted by both /super-admin/users and /admin/users. The `tier`
 * prop only affects the page gate + copy; the real authority ceiling (who can manage/assign whom)
 * comes from the signed-in actor's role via lib/auth/user-governance and is always re-enforced
 * server-side (see /api/users/[id]). A console admin sees everyone but can only act on accounts
 * below the admin tier.
 */
export function UsersWorkspace({ tier }: { tier: UsersWorkspaceTier }) {
  const { role, isAdmin, isSuperAdmin, isLoading: authLoading, email: currentUserEmail } = useAuth();
  const { users, isLoading, updateUser } = useAdminUsers();
  const { ministries } = useTaxonomyStore();

  const actorRole: AccountRole = role ?? "registered";
  const allowed = tier === "super-admin" ? isSuperAdmin : isAdmin;

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Sovereign Compliance & Identity drawer filters (NDA, KYC accreditation, MFA posture, ministry
  // binding) — ministryId doubles as the drill-down target set via the taxonomies workspace's
  // "N Government Officials" link (see the ?ministry= parsing below).
  const [filters, setFilters] = useState<UserComplianceFilters>(DEFAULT_USER_COMPLIANCE_FILTERS);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: AdminUserRecord; nextRole: AccountRole } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<{ rows: AdminUserRecord[]; clear: () => void } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ user: AdminUserRecord; action: AccountStatusAction } | null>(
    null
  );
  const [editDetailsUser, setEditDetailsUser] = useState<AdminUserRecord | null>(null);

  const basePath = tier === "super-admin" ? "/super-admin/users" : "/admin/users";
  const selectedUser = users.find((u) => u.userId === selectedUserId) ?? null;

  const canManage = (u: AdminUserRecord) => u.email !== currentUserEmail && canManageTarget(actorRole, u.role);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("userId");
    if (id) setSelectedUserId(id);
    // Drill-down entry point from the Government Executive Report's "Institutional Participant
    // Summary" (and any other report/dashboard card) — pre-selects the matching role tab.
    const roleParam = params.get("role");
    if (roleParam && (Object.keys(ROLE_LABELS) as string[]).includes(roleParam)) {
      setRoleFilter(roleParam as AccountRole);
    }
    // Drill-down entry point from the Taxonomies workspace's "N Government Officials" link.
    const ministryParam = params.get("ministry");
    if (ministryParam) setFilters((f) => ({ ...f, ministryId: ministryParam }));
  }, []);

  useEffect(() => {
    const query = selectedUserId ? `?userId=${selectedUserId}` : "";
    window.history.replaceState(null, "", `${basePath}${query}`);
  }, [selectedUserId, basePath]);

  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.accountStatus === "active").length;
    const pending = users.filter((u) => u.accountStatus === "pending").length;
    return { total, active, pending };
  }, [users]);

  const filteredUsers = useMemo(
    () => users.filter((u) => matchesUserRow(u, roleFilter, statusFilter, filters)),
    [users, roleFilter, statusFilter, filters]
  );

  const applyRoleChange = async (reason: string) => {
    if (!pendingRoleChange) return;
    const { user, nextRole } = pendingRoleChange;
    try {
      await updateUser(user.userId, { role: nextRole, reason });
      toast.success(`${user.name}'s role updated to ${ROLE_LABELS[nextRole]}`);
      setPendingRoleChange(null);
    } catch {
      toast.error("Failed to update role");
    }
  };

  const STATUS_ACTION_TARGET: Record<AccountStatusAction, AdminUserRecord["accountStatus"]> = {
    suspend: "suspended",
    reactivate: "active",
    deactivate: "deactivated",
  };

  /** Four-Eyes governance: every Suspend/Reactivate/Deactivate now requires an explicit,
   *  audit-logged justification captured by AccountStatusModal — replaces the old instant,
   *  canned-reason toggleSuspend/deactivate helpers. */
  const applyStatusChange = async (reason: string) => {
    if (!pendingStatusChange) return;
    const { user, action } = pendingStatusChange;
    const next = STATUS_ACTION_TARGET[action];
    try {
      await updateUser(user.userId, { accountStatus: next, reason });
      toast.success(`${user.name} is now ${STATUS_LABELS[next]}`);
      setPendingStatusChange(null);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const updateMinistry = async (userId: string, ministryId: string | null) => {
    try {
      await updateUser(userId, { ministryId, reason: `Ministry binding updated from ${tier} console` });
      toast.success("Ministry binding updated");
    } catch {
      toast.error("Failed to update ministry binding");
    }
  };

  const saveDetails = async (updates: { organization: string | null; jobTitle: string | null; phone: string | null }) => {
    if (!editDetailsUser) return;
    try {
      await updateUser(editDetailsUser.userId, { ...updates, reason: `Profile details edited from ${tier} console` });
      toast.success(`${editDetailsUser.name}'s details were updated`);
      setEditDetailsUser(null);
    } catch {
      toast.error("Failed to update details");
    }
  };

  const bulkDeactivate = async (rows: AdminUserRecord[], clear: () => void) => {
    const targets = rows.filter((r) => canManage(r) && r.accountStatus !== "suspended");
    let ok = 0;
    for (const row of targets) {
      try {
        await updateUser(row.userId, { accountStatus: "suspended", reason: `Bulk suspension from ${tier} console` });
        ok += 1;
      } catch {
        /* summarized below */
      }
    }
    clear();
    toast.success(`Suspended ${ok} of ${targets.length} eligible account(s)`);
  };

  const applyBulkRole = async (nextRole: AccountRole, reason: string) => {
    if (!bulkRole) return;
    const targets = bulkRole.rows.filter((r) => canManage(r) && r.role !== nextRole);
    let ok = 0;
    for (const row of targets) {
      try {
        await updateUser(row.userId, { role: nextRole, reason });
        ok += 1;
      } catch {
        /* summarized below */
      }
    }
    bulkRole.clear();
    setBulkRole(null);
    toast.success(`Updated ${ok} of ${targets.length} eligible account(s) to ${ROLE_LABELS[nextRole]}`);
  };

  const exportCsv = (rows: AdminUserRecord[], clear: () => void) => {
    const header = ["Account ID", "Name", "Email", "Role", "Status", "Organization", "Joined"];
    const lines = rows.map((r) =>
      [
        formatAccountRef(r.accountSeq),
        r.name,
        r.email,
        ROLE_LABELS[r.role],
        STATUS_LABELS[r.accountStatus],
        r.organization ?? "",
        new Date(r.createdAt).toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `zida-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    clear();
    toast.success(`Exported ${rows.length} account(s)`);
  };

  const columns: ColumnDef<AdminUserRecord, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.name} ${row.email}`,
        cell: ({ row }) => (
          // Bounded width + truncate: an unconstrained stacked name/email pair (a long
          // organization-style name, or a long email) would otherwise force the whole table
          // wider than its panel instead of wrapping cleanly — same fix as ReportStat's overflow.
          <div className="min-w-0 max-w-[220px]">
            <p className="truncate text-white font-medium" title={row.original.name}>
              {row.original.name}
            </p>
            <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }} title={row.original.email}>
              {row.original.email}
            </p>
          </div>
        ),
      },
      {
        id: "accountRef",
        header: "Account ID",
        accessorFn: (row) => formatAccountRef(row.accountSeq),
        cell: ({ row }) => (
          <span className="font-mono text-xs" style={{ color: "var(--color-text-muted)" }}>
            {formatAccountRef(row.original.accountSeq)}
          </span>
        ),
      },
      {
        accessorKey: "organization",
        header: "Organization",
        cell: ({ row }) => (
          <span className="block max-w-[160px] truncate" title={row.original.organization ?? undefined}>
            {row.original.organization ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <span className="status-badge status-badge-active">{ROLE_LABELS[row.original.role]}</span>,
      },
      {
        accessorKey: "accountStatus",
        header: "Status",
        cell: ({ row }) => (
          <span className="status-badge" style={{ color: STATUS_COLOR[row.original.accountStatus] }}>
            {STATUS_LABELS[row.original.accountStatus]}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const u = row.original;
          const manageable = canManage(u);
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    aria-label="Row actions"
                  >
                    <MoreHorizontal className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedUserId(u.userId)}>Open workspace</DropdownMenuItem>
                  {manageable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBulkRole({ rows: [u], clear: () => {} })}>
                        Change role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditDetailsUser(u)}>Edit details</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setPendingStatusChange({ user: u, action: u.accountStatus === "suspended" ? "reactivate" : "suspend" })
                        }
                      >
                        {u.accountStatus === "suspended" ? "Reactivate account" : "Suspend account"}
                      </DropdownMenuItem>
                      {u.accountStatus !== "deactivated" && (
                        <DropdownMenuItem
                          onClick={() => setPendingStatusChange({ user: u, action: "deactivate" })}
                          className="text-red-400 focus:text-red-400"
                        >
                          Deactivate (archive)
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actorRole, currentUserEmail]
  );

  if (!authLoading && !allowed) {
    return (
      <AccessGate
        title="Sign in required"
        description={
          tier === "super-admin"
            ? "Use a super admin pilot account to manage platform users and roles."
            : "Use a ZIDA admin account to manage users below the admin tier."
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users &amp; Roles</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {tier === "admin"
              ? "Manage investor, government, and registered accounts. Admin and platform-owner accounts are managed by the super admin."
              : `${users.length} accounts across every role tier. Click a row to open the account workspace.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => exportCsv(filteredUsers, () => {})}>
            <Download className="h-4 w-4" /> Export users (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite user
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> Create user
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Accounts" value={kpis.total} icon={UsersIcon} accent="green" />
        <StatCard label="Active" value={kpis.active} icon={ShieldCheck} accent="gold" />
        <StatCard
          label="MFA Compliance"
          value="0%"
          icon={ShieldCheck}
          accent="muted"
          trend={{ text: "Not enforced", tone: "warning" }}
        />
        <StatCard
          label="Pending Invites"
          value={kpis.pending}
          icon={UserPlus}
          accent="muted"
          trend={{ text: "Email pending", tone: "neutral" }}
        />
      </div>

      <UserDirectoryFiltersBar
        users={users}
        ministries={ministries}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading || authLoading}
        emptyMessage="No users match these filters."
        getRowId={(row) => row.userId}
        enableRowSelection
        hideSearch
        onRowClick={(row) => setSelectedUserId(row.userId)}
        bulkActions={(rows, clear) => (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkRole({ rows, clear })}>
              <ShieldCheck className="h-3.5 w-3.5" /> Change role
            </Button>
            <Button size="sm" variant="destructive" onClick={() => bulkDeactivate(rows, clear)}>
              <UserX className="h-3.5 w-3.5" /> Suspend
            </Button>
            <Button size="sm" variant="secondary" onClick={() => exportCsv(rows, clear)}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        )}
      />

      <UserDetailDrawer
        user={selectedUser}
        isSelf={selectedUser?.email === currentUserEmail}
        onClose={() => setSelectedUserId(null)}
        onRequestRoleChange={(user, nextRole) => setPendingRoleChange({ user, nextRole })}
        onRequestStatusChange={(user, action) => setPendingStatusChange({ user, action })}
        onUpdateMinistry={updateMinistry}
      />

      <RoleChangeModal
        user={pendingRoleChange?.user ?? null}
        nextRole={pendingRoleChange?.nextRole ?? null}
        onConfirm={applyRoleChange}
        onCancel={() => setPendingRoleChange(null)}
      />

      <AccountStatusModal
        user={pendingStatusChange?.user ?? null}
        action={pendingStatusChange?.action ?? null}
        onConfirm={applyStatusChange}
        onCancel={() => setPendingStatusChange(null)}
      />

      <InviteUserModal open={inviteOpen} onOpenChange={setInviteOpen} assignableRoles={assignableRoles(actorRole)} />

      <CreateUserModal open={createOpen} onOpenChange={setCreateOpen} assignableRoles={assignableRoles(actorRole)} />

      <BulkRoleModal
        pending={bulkRole}
        assignable={assignableRoles(actorRole)}
        onCancel={() => setBulkRole(null)}
        onConfirm={applyBulkRole}
      />

      <EditDetailsModal user={editDetailsUser} onCancel={() => setEditDetailsUser(null)} onSave={saveDetails} />
    </div>
  );
}

/** "Edit details" row action — lets staff correct another user's organization/job title/phone,
 *  fields that live in our own `profiles` table (safe to admin-edit). Deliberately excludes
 *  Name/Email, which are Better-Auth-owned and can't be safely admin-edited here. */
function EditDetailsModal({
  user,
  onCancel,
  onSave,
}: {
  user: AdminUserRecord | null;
  onCancel: () => void;
  onSave: (updates: { organization: string | null; jobTitle: string | null; phone: string | null }) => Promise<void>;
}) {
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const open = Boolean(user);

  useEffect(() => {
    if (user) {
      setOrganization(user.organization ?? "");
      setJobTitle(user.jobTitle ?? "");
      setPhone(user.phone ?? "");
      setBusy(false);
    }
  }, [user]);

  if (!user) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await onSave({
        organization: organization.trim() || null,
        jobTitle: jobTitle.trim() || null,
        phone: phone.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit details for {user.name}</DialogTitle>
          <DialogDescription>
            Organization, job title, and phone are the only fields admin-editable here — name and email are managed by
            the account&apos;s own sign-in provider.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Organization
            </label>
            <input value={organization} onChange={(e) => setOrganization(e.target.value)} className="dashboard-input" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Job title
            </label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="dashboard-input" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Phone
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="dashboard-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Batch role change confirmation — a single justification applied to every selected account, so a
 *  bulk privilege change is still attributable in the audit trail. */
function BulkRoleModal({
  pending,
  assignable,
  onCancel,
  onConfirm,
}: {
  pending: { rows: AdminUserRecord[]; clear: () => void } | null;
  assignable: AccountRole[];
  onCancel: () => void;
  onConfirm: (role: AccountRole, reason: string) => Promise<void>;
}) {
  const [role, setRole] = useState<AccountRole>("qualified");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const open = Boolean(pending);

  useEffect(() => {
    if (open) {
      setRole(assignable[0] ?? "qualified");
      setReason("");
      setBusy(false);
    }
  }, [open, assignable]);

  if (!pending) return null;

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(role, reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change role for {pending.rows.length} account(s)</DialogTitle>
          <DialogDescription>Every eligible selected account (excluding your own and accounts above your tier) will be set to the chosen role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              New role
            </label>
            <select value={role} onChange={(e) => setRole(e.target.value as AccountRole)} className="dashboard-input">
              {assignable.map((r) => (
                <option key={r} value={r} style={{ background: "#0a140a" }}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Justification (required — recorded in the audit log)
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="dashboard-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={busy || !reason.trim()}>
            {busy ? "Applying…" : "Apply to all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
