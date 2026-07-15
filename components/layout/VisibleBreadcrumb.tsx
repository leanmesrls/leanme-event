import Link from "next/link";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

interface VisibleBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function VisibleBreadcrumb({ items }: VisibleBreadcrumbProps) {
  if (items.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="border-b border-white/[0.06] bg-black">
      <ol className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-2 gap-y-1 px-5 py-3 text-xs text-white/45 md:px-10 lg:px-16">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="inline-flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-white/25">
                  /
                </span>
              ) : null}
              {isLast ? (
                <span aria-current="page" className="text-white/70">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="transition hover:text-leanme-fuchsia"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
