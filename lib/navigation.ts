import type { NavItem, Percorso } from "@/types/content";
import type { HomeNavItem } from "@/types/homepage";

export function buildHeaderNavigation(
  items: HomeNavItem[],
  percorsi: Percorso[]
): NavItem[] {
  return items.map((item) => {
    if (item.href === "/come-possiamo-aiutarti") {
      return {
        ...item,
        children: percorsi.map((percorso) => ({
          label: percorso.title,
          href: `/come-possiamo-aiutarti/${percorso.slug}`,
        })),
      };
    }

    if (item.href === "/chi-siamo") {
      const chiSiamoChildren =
        item.children && item.children.length > 0 ? item.children : undefined;

      return {
        ...item,
        children: chiSiamoChildren ?? [
          {
            label: "Staff Ibrido Humani+AI",
            href: "/staff-ibrido",
          },
          {
            label: "Dicono di noi",
            href: "/dicono-di-noi",
          },
        ],
      };
    }

    return item;
  });
}
