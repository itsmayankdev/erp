"use client";

import { useMemo, useState } from "react";

const money = (v: any) => "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const qty = (v: any) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });

export default function InventoryClient({ stocks, companyName }: any) {
  const [status, setStatus] = useState("All");
  const [material, setMaterial] = useState("All");
  const [warehouse, setWarehouse] = useState("All");
  const [search, setSearch] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const materials = useMemo(
    () => Array.from(new Set(stocks.map((s: any) => s.material?.name).filter(Boolean))),
    [stocks]
  );
  const warehouses = useMemo(
    () => Array.from(new Set(stocks.map((s: any) => s.warehouse?.name).filter(Boolean))),
    [stocks]
  );

  const filtered = useMemo(
    () =>
      stocks.filter((s: any) => {
        const hay = [
          s.material?.name,
          s.material?.code,
          s.warehouse?.name,
          s.purchase?.reference,
          s.deal?.id,
          s.deal?.buyer?.name,
          s.deal?.seller?.name,
        ]
          .join(" ")
          .toLowerCase();

        return (
          (status === "All" || s.status === status) &&
          (material === "All" || s.material?.name === material) &&
          (warehouse === "All" || s.warehouse?.name === warehouse) &&
          (!search || hay.includes(search.toLowerCase()))
        );
      }),
    [stocks, status, material, warehouse, search]
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (a: any, s: any) => {
          const q = Number(s.quantity);
          const r = Number(s.reservedQty || 0);
          const available = Math.max(0, q - r);
          const cost = Number(s.unitCost || 0);

          a.lots += 1;
          a.qty += q;
          a.reserved += r;
          a.available += available;
          a.value += q * cost;
          return a;
        },
        { lots: 0, qty: 0, reserved: 0, available: 0, value: 0 }
      ),
    [filtered]
  );

  const allocations = useMemo(
    () =>
      filtered
        .flatMap((s: any) =>
          (s.stockAllocations || []).map((a: any) => ({ ...a, stock: s }))
        )
        .sort(
          (a: any, b: any) =>
            new Date(b.allocatedAt).getTime() - new Date(a.allocatedAt).getTime()
        ),
    [filtered]
  );

  return (
    <>
      <section className="moduleCards inventoryKpis">
        <div><b>STOCK LOTS</b><strong>{totals.lots}</strong><span>Current inventory lots</span></div>
        <div><b>TOTAL QUANTITY</b><strong>{qty(totals.qty)} KG</strong><span>Physical stock remaining</span></div>
        <div><b>AVAILABLE</b><strong>{qty(totals.available)} KG</strong><span>Free for new sales orders</span></div>
        <div><b>RESERVED</b><strong>{qty(totals.reserved)} KG</strong><span>Committed to sales orders</span></div>
        <div><b>INVENTORY VALUE</b><strong>{money(totals.value)}</strong><span>Current lot value at landed unit cost</span></div>
      </section>

      <section className="modulePanel inventoryControlPanel">
        <div className="inventoryFilters">
          <div className="inventoryFilterSearch">
            <label>Search inventory</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Material, supplier, deal, purchase..." />
          </div>
          <div>
            <label>Material</label>
            <select value={material} onChange={(e) => setMaterial(e.target.value)}>
              <option>All</option>
              {materials.map((x: any) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label>Warehouse</label>
            <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)}>
              <option>All</option>
              {warehouses.map((x: any) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              <option>Available</option>
              <option>Reserved</option>
              <option>Incoming</option>
              <option>Sold</option>
              <option>Blocked</option>
              <option>Damaged</option>
              <option>Quarantine</option>
            </select>
          </div>
          <button className="secondaryBtn inventoryAuditButton" onClick={() => setAuditOpen((v) => !v)}>
            {auditOpen ? "Hide" : "View"} stock usage
          </button>
        </div>
      </section>

      <section className="modulePanel">
        <div className="panelHead">
          <div>
            <h3>Central inventory register</h3>
            <p>Every lot is tied to its material, warehouse, originating purchase and commercial deal.</p>
          </div>
          <span className="tableCount">{filtered.length} lots</span>
        </div>

        <div className="tableWrap">
          <table className="inventoryTable">
            <thead>
              <tr>
                <th>Material</th>
                <th>Source / Purchase</th>
                <th>Warehouse</th>
                <th>Total Qty</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Landed Cost</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => {
                const q = Number(s.quantity);
                const r = Number(s.reservedQty || 0);
                const available = Math.max(0, q - r);
                const statusClass = String(s.status || "").toLowerCase().replace(/\s+/g, "-");

                return (
                  <tr key={s.id}>
                    <td><b>{s.material?.name || "—"}</b><small>{s.material?.code || ""} · {s.material?.unit || "KG"}</small></td>
                    <td><b>{companyName || "Our Company"}</b><small>Current stock owner</small></td>
                    <td><b>{s.purchase?.reference || "Direct / Own Procurement"}</b><small>{s.purchase?.seller?.name || s.deal?.seller?.name || "Purchased directly by us"}</small></td>
                    <td>{s.warehouse?.name || "Unassigned"}<small>{s.warehouse?.city || ""}</small></td>
                    <td>{qty(q)} {s.material?.unit || "KG"}</td>
                    <td>{qty(r)}</td>
                    <td><b>{qty(available)}</b></td>
                    <td>{money(s.unitCost)}/{String(s.material?.unit || "KG").toLowerCase()}</td>
                    <td><b>{money(q * Number(s.unitCost || 0))}</b></td>
                    <td><span className={"statusPill status-" + statusClass}>{s.status}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="emptyState">No inventory lots match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {auditOpen && (
        <section className="modulePanel inventoryAuditPanel">
          <div className="panelHead">
            <div>
              <h3>Stock usage audit</h3>
              <p>Exact record of where company-owned stock was reserved and which customer order consumed it.</p>
            </div>
            <span className="tableCount">{allocations.length} allocations</span>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Allocated</th><th>Stock Lot</th><th>Material</th><th>Qty Used</th>
                  <th>Buyer</th><th>Sales Order</th><th>Warehouse</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a: any) => {
                  const statusClass = String(a.status || "").toLowerCase().replace(/\s+/g, "-");
                  return (
                    <tr key={a.id}>
                      <td>{new Date(a.allocatedAt).toLocaleDateString("en-IN")}</td>
                      <td><b>{a.stock?.purchase?.reference || a.stock?.id?.slice(0, 10)}</b></td>
                      <td>{a.stock?.material?.name || "—"}</td>
                      <td><b>{qty(a.quantity)} {a.stock?.material?.unit || "KG"}</b></td>
                      <td>{a.salesOrder?.buyer?.name || "—"}</td>
                      <td><b>{a.salesOrder?.reference || "—"}</b></td>
                      <td>{a.warehouse?.name || a.stock?.warehouse?.name || "—"}</td>
                      <td><span className={"statusPill status-" + statusClass}>{a.status}</span></td>
                    </tr>
                  );
                })}
                {allocations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="emptyState">No stock usage allocations for the selected inventory.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
