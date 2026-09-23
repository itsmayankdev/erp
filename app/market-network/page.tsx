import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CLOSED_SUPPLY = ["Closed", "Cancelled", "Converted"];
const CLOSED_DEMAND = ["Closed", "Cancelled", "Fulfilled", "Matched"];

export default async function MarketNetwork() {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!company) return <main className="modulePage"><p>No company found.</p></main>;

  const [sellers, buyers, opportunities, demands] = await Promise.all([
    prisma.seller.findMany({
      where: { companyId: company.id },
      include: { opportunities: { include: { material: true }, orderBy: { updatedAt: "desc" } } },
      orderBy: { name: "asc" }
    }),
    prisma.buyer.findMany({
      where: { companyId: company.id },
      include: { demands: { include: { material: true }, orderBy: { updatedAt: "desc" } } },
      orderBy: { name: "asc" }
    }),
    prisma.opportunity.findMany({
      where: { companyId: company.id, status: { notIn: CLOSED_SUPPLY } },
      include: { seller: true, material: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.buyerDemand.findMany({
      where: { companyId: company.id, status: { notIn: CLOSED_DEMAND } },
      include: { buyer: true, material: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const activeSupply = opportunities.filter(o => Number(o.quantity) - Number(o.allocatedQuantity || 0) > 0.0001);
  const activeDemand = demands.filter(d => Number(d.quantity) - Number(d.matchedQuantity || 0) > 0.0001);

  const activeSupplyIds = new Set(activeSupply.map(o => o.id));
  const activeDemandIds = new Set(activeDemand.map(d => d.id));

  const supplierRows = sellers.map(s => ({
    ...s,
    opportunities: s.opportunities.filter(o => activeSupplyIds.has(o.id))
  })).filter(s => s.opportunities.length > 0);

  const buyerRows = buyers.map(b => ({
    ...b,
    demands: b.demands.filter(d => activeDemandIds.has(d.id))
  })).filter(b => b.demands.length > 0);

  return <main className="modulePage">
    <header className="moduleHeader">
      <div>
        <p className="eyebrow">TRADING NETWORK</p>
        <h1>Market Network</h1>
        <p className="muted">Your internal knowledge base of buyers, sellers, materials, availability and active requirements.</p>
      </div>
      <div className="moduleActions"><Link className="secondaryBtn" href="/smart-finder">Open Smart Material Finder</Link></div>
    </header>

    <section className="networkStats">
      <div><span>SELLERS</span><b>{sellers.length}</b><small>Companies in seller master</small></div>
      <div><span>BUYERS</span><b>{buyers.length}</b><small>Companies in buyer master</small></div>
      <div><span>ACTIVE SUPPLY</span><b>{activeSupply.length}</b><small>Records with quantity remaining</small></div>
      <div><span>ACTIVE DEMAND</span><b>{activeDemand.length}</b><small>Requirements with quantity remaining</small></div>
    </section>

    <div className="networkGrid">
      <section className="modulePanel">
        <div className="panelHead"><div><h3>Supplier network</h3><p>Active supply currently available from each seller.</p></div></div>
        <div className="networkList">
          {supplierRows.map(s => <div className="networkRow" key={s.id}>
            <div><b>{s.name}</b><small>{s.city || "Location not recorded"} · {s.reliability || "Reliability not rated"}</small></div>
            <div>{s.opportunities.map(o => {
              const remaining = Number(o.quantity) - Number(o.allocatedQuantity || 0);
              return <span className="networkChip" key={o.id}>{o.material.name} · {remaining.toLocaleString("en-IN")} {o.unit}{o.askingRate != null ? " · ₹" + Number(o.askingRate).toLocaleString("en-IN") : ""}</span>;
            })}</div>
          </div>)}
          {!supplierRows.length && <div className="emptyState">No active supplier signals.</div>}
        </div>
      </section>

      <section className="modulePanel">
        <div className="panelHead"><div><h3>Buyer network</h3><p>Open requirements currently available for matching.</p></div></div>
        <div className="networkList">
          {buyerRows.map(b => <div className="networkRow" key={b.id}>
            <div><b>{b.name}</b><small>{b.city || "Location not recorded"}</small></div>
            <div>{b.demands.map(d => {
              const remaining = Number(d.quantity) - Number(d.matchedQuantity || 0);
              return <span className="networkChip demandChip" key={d.id}>{d.material.name} · {remaining.toLocaleString("en-IN")} {d.unit}{d.targetRate != null ? " · target ₹" + Number(d.targetRate).toLocaleString("en-IN") : ""}</span>;
            })}</div>
          </div>)}
          {!buyerRows.length && <div className="emptyState">No active buyer requirements.</div>}
        </div>
      </section>
    </div>

    <section className="networkGrid">
      <section className="modulePanel">
        <div className="panelHead"><div><h3>Active supply signals</h3><p>These are the exact remaining quantities Smart Material Finder can match.</p></div></div>
        <div className="networkTable">
          {activeSupply.map(o => {
            const remaining = Number(o.quantity) - Number(o.allocatedQuantity || 0);
            return <div key={o.id}><b>{o.material.name}</b><span>{o.seller.name}</span><span>{remaining.toLocaleString("en-IN")} {o.unit}</span><strong>{o.askingRate != null ? "₹" + Number(o.askingRate).toLocaleString("en-IN") : "Price not recorded"}</strong></div>;
          })}
          {!activeSupply.length && <div className="emptyState">No active supply signals.</div>}
        </div>
      </section>

      <section className="modulePanel">
        <div className="panelHead"><div><h3>Active buyer requirements</h3><p>These are the exact remaining quantities available for matching.</p></div></div>
        <div className="networkTable">
          {activeDemand.map(d => {
            const remaining = Number(d.quantity) - Number(d.matchedQuantity || 0);
            return <div key={d.id}><b>{d.material.name}</b><span>{d.buyer.name}</span><span>{remaining.toLocaleString("en-IN")} {d.unit}</span><strong>{d.targetRate != null ? "₹" + Number(d.targetRate).toLocaleString("en-IN") : "Target not recorded"}</strong></div>;
          })}
          {!activeDemand.length && <div className="emptyState">No active buyer requirements.</div>}
        </div>
      </section>
    </section>
  </main>;
}
