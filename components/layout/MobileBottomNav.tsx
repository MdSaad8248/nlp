"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Cpu, CheckSquare, Calendar, Sparkles } from "lucide-react";

const MOBILE_NAV_ITEMS = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Studio", href: "/intelligence-studio", icon: Cpu },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "AI", href: "/assistant", icon: Sparkles, isAI: true },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${isActive ? (item.isAI ? "active-ai" : "active") : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
