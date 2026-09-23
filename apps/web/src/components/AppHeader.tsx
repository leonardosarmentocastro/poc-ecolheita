"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, Text } from "@mantine/core";

const LINKS = [
  { href: "/produtos", label: "Produtos" },
  { href: "/buscar", label: "Buscar" },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="flex items-center gap-6 border-b border-[var(--mantine-color-gray-3)] px-4 py-2">
      <Text fw={600}>Ecolheita</Text>
      <nav aria-label="Principal" className="flex items-center gap-2">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Anchor
              key={link.href}
              component={Link}
              href={link.href}
              aria-current={active ? "page" : undefined}
              // The current page is told by weight as well as by aria-current — never by colour alone.
              fw={active ? 600 : 400}
              className="flex min-h-[44px] items-center px-2"
            >
              {link.label}
            </Anchor>
          );
        })}
      </nav>
    </header>
  );
}
