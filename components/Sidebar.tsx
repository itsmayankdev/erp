"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2, LayoutDashboard, PackageSearch, Search, Zap, BriefcaseBusiness, FileCheck2,
  ShoppingCart, Boxes, ReceiptText, Truck, Users, Warehouse, ClipboardList,
  Factory, Layers3, CreditCard, FileText, BarChart3, ChevronLeft, ChevronRight
} from "lucide-react";

const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/supply-demand", "Supply & Demand", PackageSearch],
  ["/suppliers", "Suppliers Register", Factory],
  ["/buyer-requirements", "Buyer Requirements", ClipboardList],
  ["/market-network", "Market Network", PackageSearch],
  ["/smart-finder", "Smart Material Finder", Search],
  ["/opportunities", "Opportunities", Zap],
  ["/buyer-demands", "Buyer Demands", ClipboardList],
  ["/deals", "Deals", BriefcaseBusiness],
  ["/agreements", "Agreements", FileCheck2],
  ["/purchase", "Purchase", ShoppingCart],
  ["/inventory", "Inventory", Boxes],
  ["/sales", "Sales", ReceiptText],
  ["/dispatch", "Dispatch", Truck],
  ["/customers-and-buyers", "Customers & Buyers", Users],
  ["/sellers", "Sellers / Suppliers", Factory],
  ["/materials", "Materials", Layers3],
  ["/warehouses", "Warehouses", Warehouse],
  ["/payments", "Payments", CreditCard],
  ["/documents", "Documents", FileText],
  ["/reports", "Reports", BarChart3]
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("erp-sidebar-collapsed") === "1");
  }, []);

  const toggle = () => {
    setCollapsed(v => {
      const next = !v;
      localStorage.setItem("erp-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside className={"sidebar " + (collapsed ? "collapsed" : "")}>
      <div className="brandRow">
        <Link href="/" className="brand">
          <div className="brandMark"><Building2 size={19} strokeWidth={2.1} /></div>
          <div><strong>STEEL OS</strong><span>Trading ERP</span></div>
        </Link>
        <button className="sidebarToggle" onClick={toggle} title={collapsed ? "Expand navigation" : "Collapse navigation"} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="navSectionLabel">OPERATIONS</div>
      <nav>
        {nav.map(([href, label, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link href={href} key={href} title={collapsed ? label : undefined} className={"navItem " + (active ? "active" : "")}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sideBottom">
        <div className="secure"><span className="dot" />SYSTEM ONLINE</div>
        <small>Centralized PostgreSQL source of truth</small>
      </div>
    </aside>
  );
}