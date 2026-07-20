"use client";

import {
  formatTenantUserLabel,
  sortTenantUsers,
} from "@/lib/lean-event/tenant-users-display";
import type { LeanEventTenantUserPublic } from "@/types/lean-event";

interface LeonardoEventProjectTeamFieldsProps {
  tenantUsers: LeanEventTenantUserPublic[];
  projectLeaderUserId: string | null;
  projectManagerUserIds: string[];
  onChange: (value: {
    projectLeaderUserId: string | null;
    projectManagerUserIds: string[];
  }) => void;
}

export function LeonardoEventProjectTeamFields({
  tenantUsers,
  projectLeaderUserId,
  projectManagerUserIds,
  onChange,
}: LeonardoEventProjectTeamFieldsProps) {
  const sortedUsers = sortTenantUsers(tenantUsers);

  function toggleManager(userId: string, checked: boolean) {
    const next = checked
      ? [...projectManagerUserIds, userId]
      : projectManagerUserIds.filter((id) => id !== userId);
    onChange({
      projectLeaderUserId,
      projectManagerUserIds: [...new Set(next)],
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-leanme-fuchsia">
          REF
        </p>
        <p className="mt-1 text-xs text-white/45">
          Project Leader (uno) e Project Manager (più utenze) scelti tra le
          utenze del tenant.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          Project Leader
        </span>
        <select
          value={projectLeaderUserId ?? ""}
          onChange={(event) => {
            const nextLeader = event.target.value || null;
            onChange({
              projectLeaderUserId: nextLeader,
              projectManagerUserIds: projectManagerUserIds.filter(
                (id) => id !== nextLeader
              ),
            });
          }}
          className="mt-2 w-full rounded-lg border border-white/15 bg-black px-4 py-3 text-sm outline-none focus:border-leanme-fuchsia"
        >
          <option value="">— Nessuno —</option>
          {sortedUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {formatTenantUserLabel(user)}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-white/55">
          Project Manager
        </legend>
        {sortedUsers.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">
            Nessuna utenza tenant configurata.
          </p>
        ) : (
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3">
            {sortedUsers.map((user) => {
              const disabled = user.id === projectLeaderUserId;
              const checked = projectManagerUserIds.includes(user.id);
              return (
                <li key={user.id}>
                  <label
                    className={`flex items-center gap-2 text-sm ${
                      disabled ? "text-white/30" : "text-white/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={(event) =>
                        toggleManager(user.id, event.target.checked)
                      }
                      className="rounded border-white/20 bg-black text-leanme-fuchsia focus:ring-leanme-fuchsia"
                    />
                    <span>{formatTenantUserLabel(user)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>
    </div>
  );
}
