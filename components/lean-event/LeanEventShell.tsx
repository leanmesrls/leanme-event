"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import configData from "@/data/lean-event/config.json";
import {
  getSessionLeonardoCapabilities,
  LEONARDO_UPGRADE_HINT,
  leonardoUpgradeMailto,
} from "@/lib/lean-event/capabilities";
import { LeanEventUpgradeHint } from "@/components/lean-event/LeanEventUpgradeHint";
import {
  leanEventLeonardoCestinoPath,
  leanEventLeonardoPath,
  leanEventLeonardoProfiloPath,
  leanEventLoginPath,
  leanEventTenantBase,
} from "@/lib/lean-event/paths";
import type { LeanEventConfig, LeanEventNavItem, LeanEventSession } from "@/types/lean-event";
import { cn } from "@/lib/utils";

const config = configData as LeanEventConfig;

interface LeanEventShellProps {
  session: LeanEventSession;
  children: React.ReactNode;
}

type NavEntry = Omit<LeanEventNavItem, "href" | "children"> & {
  href: string;
  enabled: boolean;
  children?: NavEntry[];
};

function resolveNavHref(
  item: LeanEventNavItem,
  tenantBase: string,
  leonardoBase: string
): string {
  return item.segment ? `${tenantBase}/${item.segment}` : leonardoBase;
}

function mapNavEntry(
  item: LeanEventNavItem,
  tenantBase: string,
  leonardoBase: string,
  session: LeanEventSession
): NavEntry {
  const children = item.children?.map((child) =>
    mapNavEntry(child, tenantBase, leonardoBase, session)
  );
  const href = resolveNavHref(item, tenantBase, leonardoBase);
  const enabled = children?.length
    ? children.some((child) => child.enabled)
    : isNavEnabled(session, item);

  return {
    id: item.id,
    label: item.label,
    segment: item.segment,
    module: item.module,
    capability: item.capability,
    icon: item.icon,
    href,
    enabled,
    children,
  };
}

function isNavActive(pathname: string, href: string, leonardoBase: string): boolean {
  return href === leonardoBase
    ? pathname === leonardoBase
    : pathname.startsWith(href);
}

function NavIcon({ icon }: { icon: NonNullable<LeanEventNavItem["icon"]> }) {
  const paths: Record<NonNullable<LeanEventNavItem["icon"]>, string> = {
    dashboard:
      "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z",
    leonardo:
      "M12 3l2.2 6.8H21l-5.6 4.1 2.1 6.8L12 16.8 6.4 20.7l2.1-6.8L3 9.8h6.8L12 3Z",
    events:
      "M8 3v3H5a2 2 0 0 0-2 2v11h18V8a2 2 0 0 0-2-2h-3V3H8Zm2 2h4V6h-4V5ZM4 10h16v9H4v-9Z",
    contacts:
      "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0H5Z",
    finance:
      "M4 20V4h3v16H4Zm6 0V9h3v11h-3Zm6 0V13h3v7h-3Z",
    support:
      "M12 3a9 9 0 0 0-9 9v4l2 3h14l2-3v-4a9 9 0 0 0-9-9Zm0 12.5A1.5 1.5 0 1 1 13.5 14 1.5 1.5 0 0 1 12 15.5Z",
    government:
      "M4 21V9l8-4 8 4v12H4Zm4-2h8v-2H8v2Zm0-4h8v-2H8v2Zm0-4h8V9H8v2Z",
    settings:
      "M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm8.2 3.5-1.4-.2a6.9 6.9 0 0 0-.8-1.9l.9-1.1-1.9-1.9-1.1.9a6.9 6.9 0 0 0-1.9-.8l-.2-1.4h-2.7l-.2 1.4a6.9 6.9 0 0 0-1.9.8l-1.1-.9-1.9 1.9.9 1.1a6.9 6.9 0 0 0-.8 1.9l-1.4.2v2.7l1.4.2a6.9 6.9 0 0 0 .8 1.9l-.9 1.1 1.9 1.9 1.1-.9a6.9 6.9 0 0 0 1.9.8l.2 1.4h2.7l.2-1.4a6.9 6.9 0 0 0 1.9-.8l1.1.9 1.9-1.9-.9-1.1a6.9 6.9 0 0 0 .8-1.9l1.4-.2v-2.7Z",
    locked:
      "M7 11V8a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v7H4v-7a2 2 0 0 1 2-2h1Zm2-3a3 3 0 0 1 6 0v3H9V8Z",
  };

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d={paths[icon]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type FooterNavIcon = "trash" | "profile";

function FooterNavIconGlyph({ icon }: { icon: FooterNavIcon }) {
  const paths: Record<FooterNavIcon, string> = {
    trash:
      "M4 7h16M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M9 11v6M15 11v6M10 7l1 12h2l1-12",
    profile:
      "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0H5Z",
  };

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d={paths[icon]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FooterNavLink({
  href,
  label,
  icon,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: FooterNavIcon;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-leanme-fuchsia/15 text-white"
          : "text-white/65 hover:bg-white/[0.04] hover:text-white"
      )}
    >
      <FooterNavIconGlyph icon={icon} />
      <span>{label}</span>
    </Link>
  );
}

function SidebarFooter({
  tenantSlug,
  pathname,
  onNavigate,
}: {
  tenantSlug: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="shrink-0 space-y-1 border-t border-white/10 pt-4">
      <FooterNavLink
        href={leanEventLeonardoCestinoPath(tenantSlug)}
        label="Cestino"
        icon="trash"
        pathname={pathname}
        onNavigate={onNavigate}
      />
      <FooterNavLink
        href={leanEventLeonardoProfiloPath(tenantSlug)}
        label="Profilo"
        icon="profile"
        pathname={pathname}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => logout()}
      className={cn(
        "w-full rounded-lg border border-white/15 px-3 py-2.5 text-left text-sm text-white/70 transition hover:border-white/30 hover:text-white",
        className
      )}
    >
      Esci
    </button>
  );
}

async function logout() {
  await fetch("/api/lean-event/auth/logout", { method: "POST" });
  window.location.href = leanEventLoginPath();
}

function isNavEnabled(session: LeanEventSession, item: LeanEventNavItem): boolean {
  const capabilities = getSessionLeonardoCapabilities(session);

  if (item.capability) {
    return capabilities[item.capability];
  }

  if (item.module && !session.modules.includes(item.module)) {
    return false;
  }

  return true;
}

function NavLink({
  item,
  pathname,
  leonardoBase,
  onNavigate,
  nested = false,
}: {
  item: NavEntry;
  pathname: string;
  leonardoBase: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const active = isNavActive(pathname, item.href, leonardoBase);

  if (!item.enabled) {
    return (
      <a
        href={leonardoUpgradeMailto(`LeanEvent - Upgrade ${item.label}`)}
        onClick={onNavigate}
        className={cn(
          "flex min-h-10 items-start gap-3 rounded-lg px-3 py-2 text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/50",
          nested && "ml-3 border-l border-white/10 pl-3"
        )}
        title={LEONARDO_UPGRADE_HINT}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-white/50">{item.label}</span>
          <LeanEventUpgradeHint className="mt-1.5" iconSize={16} />
        </span>
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        nested ? "ml-3 border-l border-white/10 pl-3 text-[13px]" : "min-h-11 py-2.5",
        active
          ? nested
            ? "border-leanme-fuchsia/60 bg-leanme-fuchsia/10 text-white"
            : "bg-leanme-fuchsia/15 text-white"
          : "text-white/65 hover:bg-white/[0.04] hover:text-white"
      )}
    >
      {!nested && item.icon ? (
        <NavIcon icon={item.icon === "locked" ? "dashboard" : item.icon} />
      ) : null}
      <span>{item.label}</span>
    </Link>
  );
}

function LeonardoNav({
  navigation,
  pathname,
  leonardoBase,
  onNavigate,
}: {
  navigation: NavEntry[];
  pathname: string;
  leonardoBase: string;
  onNavigate?: () => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {}
  );

  function isGroupCollapsed(item: NavEntry): boolean {
    const groupActive = item.children?.some((child) =>
      isNavActive(pathname, child.href, leonardoBase)
    );
    if (groupActive) {
      return false;
    }
    return collapsedGroups[item.id] ?? true;
  }

  function toggleGroup(itemId: string) {
    setCollapsedGroups((current) => {
      const isCollapsed = current[itemId] ?? true;
      return {
        ...current,
        [itemId]: !isCollapsed,
      };
    });
  }

  return (
    <nav aria-label="Leonardo" className="space-y-1">
      {navigation.map((item) => {
        if (item.children?.length) {
          const groupActive = item.children.some((child) =>
            isNavActive(pathname, child.href, leonardoBase)
          );
          const collapsed = isGroupCollapsed(item);

          return (
            <div key={item.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(item.id)}
                aria-expanded={!collapsed}
                className={cn(
                  "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition hover:bg-white/[0.04]",
                  groupActive ? "text-white" : "text-white/55"
                )}
              >
                {item.icon ? (
                  <NavIcon
                    icon={item.icon === "locked" ? "dashboard" : item.icon}
                  />
                ) : null}
                <span className="flex-1">{item.label}</span>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    collapsed ? "" : "rotate-180"
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {!collapsed ? (
                <div className="space-y-0.5">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.id}
                      item={child}
                      pathname={pathname}
                      leonardoBase={leonardoBase}
                      onNavigate={onNavigate}
                      nested
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <NavLink
            key={item.id}
            item={item}
            pathname={pathname}
            leonardoBase={leonardoBase}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

export function LeanEventShell({ session, children }: LeanEventShellProps) {
  const pathname = usePathname();
  const tenantBase = leanEventTenantBase(session.tenantSlug);
  const leonardoBase = leanEventLeonardoPath(session.tenantSlug);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = config.navigation.map((item) =>
    mapNavEntry(item, tenantBase, leonardoBase, session)
  );

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-[100dvh] bg-[#121216] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#121216] px-5 py-8 lg:flex">
          <div className="border-b border-white/10 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leanme-fuchsia">
              LeanEvent
            </p>
            <p className="mt-2 text-lg font-bold tracking-[0.06em]">
              {session.tenantName}
            </p>
            <p className="mt-1 text-xs text-white/55">{session.userName}</p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Leonardo
            </p>

            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              <LeonardoNav
                navigation={navigation}
                pathname={pathname}
                leonardoBase={leonardoBase}
              />
            </div>

            <SidebarFooter tenantSlug={session.tenantSlug} pathname={pathname} />
            <LogoutButton className="mt-3 shrink-0" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#121216]/95 px-4 py-3 backdrop-blur md:px-8 md:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white lg:hidden"
                    aria-label="Apri menu Leonardo"
                    aria-expanded={mobileOpen}
                    aria-controls="leanyou-mobile-nav"
                    onClick={() => setMobileOpen(true)}
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-leanme-fuchsia sm:text-xs">
                      Area riservata clienti
                    </p>
                    <h1 className="mt-0.5 truncate text-lg font-bold tracking-[0.04em] sm:text-xl md:text-2xl">
                      {config.leonardo.title}
                    </h1>
                    <p className="mt-0.5 hidden text-xs text-white/55 sm:block">
                      {config.leonardo.subtitle}
                    </p>
                  </div>
                </div>
                <p className="mt-1 truncate text-xs text-white/50 lg:hidden">
                  {session.tenantName} · {session.userName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Image
                  src={config.leonardo.logo}
                  alt="Lean.Agent Leonardo"
                  width={40}
                  height={40}
                  className="h-9 w-9 rounded-full border border-white/10 sm:h-12 sm:w-12"
                />
              </div>
            </div>
          </header>

          <main className="flex-1 bg-[#141418] px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="leanyou-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Leonardo"
          className="fixed inset-0 z-50 lg:hidden"
        >
          <button
            type="button"
            aria-label="Chiudi menu"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leanme-fuchsia">
                  LeanEvent
                </p>
                <p className="mt-1 text-sm font-bold">{session.tenantName}</p>
              </div>
              <button
                type="button"
                aria-label="Chiudi menu"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/15"
                onClick={() => setMobileOpen(false)}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Leonardo
              </p>
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                <LeonardoNav
                  navigation={navigation}
                  pathname={pathname}
                  leonardoBase={leonardoBase}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
              <SidebarFooter
                tenantSlug={session.tenantSlug}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
            <div className="shrink-0 border-t border-white/10 p-4">
              <LogoutButton className="py-3" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
