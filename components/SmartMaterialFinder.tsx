"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  Package,
  MapPin,
  CheckCircle2,
  X,
} from "lucide-react";

type FinderProps = {
  materials: any[];
  buyers: any[];
  demands: any[];
};

export default function SmartMaterialFinder({
  materials,
  buyers,
  demands,
}: FinderProps) {
  const [materialId, setMaterialId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [demandId, setDemandId] = useState("");
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [working, setWorking] = useState(false);
  const [allocation, setAllocation] = useState<any[]>([]);

  const buyerDemands = demands.filter(
    (d: any) => !buyerId || d.buyerId === buyerId
  );
  const selectedMaterial = materials.find((m: any) => m.id === materialId);

  function chooseDemand(id: string) {
    setDemandId(id);
    const demand = demands.find((d: any) => d.id === id);
    if (!demand) return;

    setBuyerId(demand.buyerId);
    setMaterialId(demand.materialId);
    setQuantity(String(Number(demand.quantity)));
    setMaxRate(
      demand.targetRate ? String(Number(demand.targetRate)) : ""
    );
    setLocation(demand.location || "");
    setQuery(
      [
        demand.material?.name,
        demand.material?.grade,
        demand.material?.specification,
        demand.notes,
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function chooseBuyer(id: string) {
    setBuyerId(id);
    setDemandId("");
  }

  async function search() {
    setLoading(true);
    setSelected(null);

    try {
      const params = new URLSearchParams();

      if (materialId) params.set("materialId", materialId);
      if (query) params.set("q", query);
      if (quantity) params.set("quantity", quantity);
      if (location) params.set("location", location);
      if (maxRate) params.set("maxRate", maxRate);
      if (buyerId) params.set("buyerId", buyerId);
      if (demandId) params.set("demandId", demandId);

      const response = await fetch("/api/smart-finder?" + params.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      const matches = data.results || [];
      setResults(matches);
      setSummary(data.summary || null);

      const required = Number(data.summary?.requestedQuantity || 0);
      let remaining = required;
      const plan: any[] = [];

      const supplierMatches = matches
        .filter((item: any) => item.opportunityId)
        .slice()
        .sort(
          (a: any, b: any) =>
            (a.rate ?? 999999999) - (b.rate ?? 999999999)
        );

      for (const item of supplierMatches) {
        if (remaining <= 0) break;

        const available = Number(item.quantity || 0);
        const take = Math.min(remaining, available);

        if (take > 0) {
          plan.push({
            ...item,
            allocatedQuantity: take,
          });
          remaining -= take;
        }
      }

      setAllocation(plan);
    } catch (error: any) {
      alert(error.message || "Unable to search the supply network.");
      setResults([]);
      setSummary(null);
      setAllocation([]);
    } finally {
      setLoading(false);
    }
  }

  async function createDeal() {
    if (!selected?.opportunityId || !demandId) {
      alert("Select a supplier opportunity and a buyer requirement first.");
      return;
    }

    setWorking(true);

    try {
      const response = await fetch("/api/workflows/convert-to-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: selected.opportunityId,
          demandId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create deal.");
      }

      window.location.href = "/deals/" + data.deal.id;
    } catch (error: any) {
      alert(error.message || "Could not create deal.");
      setWorking(false);
    }
  }

  async function createCombinedDeal() {
    if (!demandId || allocation.length < 2) return;

    setWorking(true);

    try {
      const response = await fetch(
        "/api/workflows/create-split-deals",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            demandId,
            allocations: allocation.map((item: any) => ({
              opportunityId: item.opportunityId,
              quantity: item.allocatedQuantity,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not create the combined deal."
        );
      }

      window.location.href = "/deals";
    } catch (error: any) {
      alert(
        error.message || "Could not create the combined deal."
      );
      setWorking(false);
    }
  }

  return (
    <div className="finder">
      <section className="finderSearch">
        <div className="finderTitle">
          <div>
            <span className="eyebrow">SUPPLY MATCHING ENGINE</span>
            <h2>Find supply for a buyer requirement</h2>
            <p>
              Select a saved requirement or enter material and quantity
              manually. The ERP searches the central supply database.
            </p>
          </div>
          <div className="finderIcon">
            <Search size={19} />
          </div>
        </div>

        <div className="finderGrid">
          <label>
            Buyer requirement
            <select
              value={demandId}
              onChange={(event) => chooseDemand(event.target.value)}
            >
              <option value="">Select a saved requirement...</option>
              {demands.map((demand: any) => (
                <option key={demand.id} value={demand.id}>
                  {demand.buyer.name} · {demand.material.name} ·{" "}
                  {Number(demand.quantity).toLocaleString("en-IN")}{" "}
                  {demand.unit}
                </option>
              ))}
            </select>
          </label>

          <label>
            Buyer
            <select
              value={buyerId}
              onChange={(event) => chooseBuyer(event.target.value)}
            >
              <option value="">Any buyer</option>
              {buyers.map((buyer: any) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Material
            <select
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value)}
            >
              <option value="">Any material</option>
              {materials.map((material: any) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                  {material.grade ? " · " + material.grade : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Material / size / specification
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. HR Coil 2mm 1250"
            />
          </label>

          <label>
            Required quantity
            <input
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="e.g. 50000"
            />
          </label>

          <label>
            Location
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Delhi / Faridabad / Bawal"
            />
          </label>

          <label>
            Maximum buy rate
            <input
              type="number"
              value={maxRate}
              onChange={(event) => setMaxRate(event.target.value)}
              placeholder="Optional ₹/unit"
            />
          </label>

          <label>
            Saved requirements for buyer
            <select
              value=""
              onChange={(event) => chooseDemand(event.target.value)}
              disabled={!buyerId}
            >
              <option value="">
                {buyerId
                  ? "Select another requirement..."
                  : "Select buyer first"}
              </option>
              {buyerDemands.map((demand: any) => (
                <option key={demand.id} value={demand.id}>
                  {demand.material.name} ·{" "}
                  {Number(demand.quantity).toLocaleString("en-IN")}{" "}
                  {demand.unit}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="finderButton"
          onClick={search}
          disabled={loading}
        >
          <Search size={15} />
          {loading ? "Searching..." : "Find Matching Supply"}
        </button>
      </section>

      {summary && (
        <section className="finderStats">
          <div>
            <span>Matches</span>
            <b>{summary.matches}</b>
          </div>
          <div>
            <span>Requirement</span>
            <b>
              {summary.requestedQuantity
                ? Number(summary.requestedQuantity).toLocaleString("en-IN")
                : "—"}
            </b>
            <small>{summary.buyer || "Manual search"}</small>
          </div>
          <div>
            <span>Lowest rate</span>
            <b>
              {summary.lowestRate
                ? "₹" +
                  Number(summary.lowestRate).toLocaleString("en-IN")
                : "—"}
            </b>
          </div>
          <div>
            <span>Supply coverage</span>
            <b>
              {summary.requestedQuantity &&
              summary.totalAvailable >= summary.requestedQuantity
                ? "Covered"
                : "Partial"}
            </b>
            <small>
              {Number(summary.totalAvailable || 0).toLocaleString(
                "en-IN"
              )}{" "}
              available
            </small>
          </div>
        </section>
      )}

      <section className="finderResults">
        <div className="finderResultsHead">
          <div>
            <h3>Matching supply</h3>
            <p>
              {selectedMaterial?.name || "All known materials"} · ranked
              by quantity, location and price fit
            </p>
          </div>
          <SlidersHorizontal size={16} />
        </div>

        {!results.length ? (
          <div className="finderEmpty">
            <Package size={22} />
            <b>Search the network</b>
            <span>
              Select a saved buyer requirement or enter material and
              quantity.
            </span>
          </div>
        ) : (
          <div className="supplyList">
            {results.map((item: any) => (
              <div
                className={
                  "supplyRow " +
                  (selected?.id === item.id ? "selectedSupply" : "")
                }
                key={item.id + "-" + item.source}
              >
                <div className="supplyMain">
                  <div className="supplyMaterial">
                    <b>{item.material}</b>
                    <span>
                      {item.grade ||
                        item.specification ||
                        "Specification not recorded"}
                    </span>
                  </div>
                  <span className="sourceTag">{item.source}</span>
                </div>

                <div>
                  <small>AVAILABLE</small>
                  <strong>
                    {Number(item.quantity).toLocaleString("en-IN")}{" "}
                    {item.unit}
                  </strong>
                </div>

                <div>
                  <small>PRICE</small>
                  <strong>
                    {item.rate
                      ? "₹" +
                        Number(item.rate).toLocaleString("en-IN")
                      : "—"}
                  </strong>
                </div>

                <div>
                  <small>SUPPLIER / LOCATION</small>
                  <strong>{item.seller || "—"}</strong>
                  <span className="rowSub">
                    <MapPin size={10} />
                    {item.location || "—"}
                  </span>
                </div>

                <div>
                  <small>MATCH</small>
                  <strong className="matchScore">
                    {item.matchScore}%
                  </strong>
                </div>

                <button
                  className="supplyAction"
                  title="Select supply"
                  onClick={() => setSelected(item)}
                >
                  {selected?.id === item.id ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <ArrowRight size={15} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {allocation.length > 1 && demandId && (
        <section className="finderAction splitMatch">
          <div>
            <span className="eyebrow">MULTI-SOURCE MATCH</span>
            <h3>
              One buyer requirement can be fulfilled from{" "}
              {allocation.length} suppliers
            </h3>
            <p>
              The ERP combines the lowest available sources until the
              remaining buyer requirement is covered.
            </p>

            <div className="allocationList">
              {allocation.map((item: any) => (
                <div key={item.opportunityId}>
                  <span>{item.seller}</span>
                  <b>
                    {Number(item.allocatedQuantity).toLocaleString(
                      "en-IN"
                    )}{" "}
                    {item.unit}
                  </b>
                  <span>
                    {item.rate
                      ? "₹" +
                        Number(item.rate).toLocaleString("en-IN")
                      : "Rate not recorded"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="finderActionButtons">
            <button
              className="saveBtn"
              onClick={createCombinedDeal}
              disabled={working}
            >
              {working ? "Creating..." : "Create Combined Deal"}
              <ArrowRight size={13} />
            </button>
          </div>
        </section>
      )}

      {selected && (
        <section className="finderAction">
          <div>
            <span className="eyebrow">SELECTED SUPPLY</span>
            <h3>
              {selected.material} ·{" "}
              {Number(selected.quantity).toLocaleString("en-IN")}{" "}
              {selected.unit}
            </h3>
            <p>
              {selected.seller || "Unknown supplier"} ·{" "}
              {selected.location || "Location not recorded"} ·{" "}
              {selected.rate
                ? "₹" + Number(selected.rate).toLocaleString("en-IN")
                : "Rate not recorded"}
            </p>
          </div>

          <div className="finderActionButtons">
            <button
              className="secondaryBtn"
              onClick={() => setSelected(null)}
            >
              <X size={13} /> Clear
            </button>

            {selected.opportunityId && demandId && (
              <button
                className="saveBtn"
                onClick={createDeal}
                disabled={working}
              >
                {working ? "Creating..." : "Create Deal from Match"}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
