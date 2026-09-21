"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, PackageSearch, Zap, BriefcaseBusiness, FileCheck2,
  ShoppingCart, Boxes, ReceiptText, Truck, Users, Warehouse
} from "lucide-react";

const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/market-intelligence", "Market Intelligence", PackageSearch],
  ["/opportunities", "Opportunities", Zap],
  ["/deals", "Deals", BriefcaseBusiness],
  ["/agreements", "Agreements", FileCheck2],
  ["/purchase", "Purchase", ShoppingCart],
  ["/inventory", "Inventory", Boxes],
  ["/sales", "Sales", ReceiptText],
  ["/dispatch", "Dispatch", Truck],
  ["/customers-and-buyers", "Customers & Buyers", Users],
  ["/warehouses", "Warehouses", Warehouse]
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brandMark">E</div>
        <div><strong>ERP</strong><span>Steel Trading OS</span></div>
      </Link>
      <div className="navSectionLabel">WORKSPACE</div>
      <nav>
        {nav.map(([href, label, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link href={href} key={href} className={"navItem " + (active ? "active" : "")}>
              <Icon size={17} strokeWidth={1.9} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sideBottom">
        <div className="secure"><span className="dot"/>SYSTEM ONLINE</div>
        <small>Centralized operational data · PostgreSQL</small>
      </div>
    </aside>
  );
}