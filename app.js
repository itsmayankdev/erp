(() => {
  "use strict";

  const NAV = {
    dashboard:"Dashboard", intelligence:"Market Intelligence", opportunities:"Material Opportunities",
    demands:"Buyer Demands", deals:"Deal Management", procurement:"Procurement", inventory:"Inventory",
    sales:"Sales & Dispatch", buyers:"Customers & Buyers", sellers:"Sellers & Suppliers",
    materials:"Material Master", warehouses:"Warehouses", payments:"Payments", reports:"Reports",
    documents:"Documents", company:"Company & Users"
  };

  const seed = {
    deals:[
      ["D-001245","E250 Plate","ABC Steel Ltd.","XYZ Industries","20 MT","₹35/kg","₹50/kg","Committed","Both"],
      ["D-001246","HR Coil","PQR Engineering","Buyer TBD","40 MT","₹40/kg","—","Opportunity","Seller only"],
      ["D-001247","MS Plate","Direct Corporate","LMN Industries","100 MT","₹52/kg","₹55/kg","Execution","Both"]
    ],
    opportunities:[
      ["OP-1001","E250 Plate","ABC Steel Ltd.","20 MT","₹35/kg","₹48–52/kg","Hot","Surplus / Dead Stock"],
      ["OP-1002","HR Coil","PQR Engineering","40 MT","₹40/kg","₹45–49/kg","Open","Surplus / Dead Stock"],
      ["OP-1003","MS Plate","Direct Corporate","100 MT","₹52/kg","₹54–56/kg","Open","Direct Corporate"],
      ["OP-1004","GI Sheet","Factory Source","60 MT","₹61/kg","₹68–70/kg","Watch","Surplus / Dead Stock"]
    ],
    demands:[
      ["DM-3001","XYZ Industries","E250 Plate","20 MT","₹50/kg","25 Sep 2026","Urgent"],
      ["DM-3002","LMN Industries","MS Plate","100 MT","₹55/kg","30 Sep 2026","Open"],
      ["DM-3003","Steel Consumer A","HR Coil","60 MT","₹48/kg","05 Oct 2026","Open"]
    ],
    buyers:[
      ["XYZ Industries","Panipat","4","18 Sep 2026","₹42L","Active"],
      ["LMN Industries","Rohtak","3","16 Sep 2026","₹28L","Active"],
      ["Steel Consumer A","Haryana","2","08 Sep 2026","₹15L","Active"],
      ["Buyer B","Delhi NCR","1","02 Sep 2026","₹9L","Active"]
    ],
    sellers:[
      ["ABC Steel Ltd.","Haryana","8","18 Sep 2026","High","Active"],
      ["PQR Engineering","Panipat","5","12 Sep 2026","Medium","Active"],
      ["Steel Supplier A","Delhi NCR","11","10 Sep 2026","High","Active"],
      ["Factory Source","Rohtak","3","05 Sep 2026","New","Active"]
    ],
    materials:[
      ["MAT-001","E250 Plate","E250","IS 2062","KG","Yes"],
      ["MAT-002","HR Coil","IS 2062","Hot Rolled","KG","Yes"],
      ["MAT-003","MS Plate","IS 2062","Commercial","KG","Yes"],
      ["MAT-004","GI Sheet","DX51D","Galvanized","KG","Yes"]
    ]
  };

  const state = {
    key: location.hash.slice(1) || "dashboard",
    query: "",
    filter: "All",
    modal: null,
    data: {}
  };

  function loadData(){
    Object.keys(seed).forEach(k=>{
      try{
        const saved=localStorage.getItem("steelos_"+k);
        state.data[k]=saved?JSON.parse(saved):seed[k].slice();
      }catch{ state.data[k]=seed[k].slice(); }
    });
  }
  function saveData(k){ try{localStorage.setItem("steelos_"+k,JSON.stringify(state.data[k]));}catch{} }

  function esc(v){
    return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }
  function pill(v){
    const x=String(v);
    let c="pGray";
    if(/hot|urgent|exposure|overdue/i.test(x)) c="pRed";
    else if(/open|watch|pending|opportunity/i.test(x)) c="pAmber";
    else if(/active|committed|received|verified|ready|delivered|both/i.test(x)) c="pGreen";
    else if(/execution|transit|planned|part paid/i.test(x)) c="pBlue";
    return '<span class="pill '+c+'">'+esc(x)+'</span>';
  }
  function kpi(label,val,sub,cls=""){
    return '<div class="kpi '+cls+'"><div class="lab">'+esc(label)+'</div><div class="val">'+esc(val)+'</div><div class="up">'+esc(sub)+'</div></div>';
  }

  function nav(){
    const links=document.querySelectorAll(".nav a");
    links.forEach(a=>{
      const k=a.getAttribute("href").slice(1);
      a.classList.toggle("active",k===state.key);
      a.onclick=()=>{ state.key=k; location.hash="#"+k; };
    });
  }

  function switchBar(){
    return '<div class="quickbar">'+
      '<button class="qbtn" data-action="dashboard">⌂ Dashboard</button>'+
      '<select class="qselect" id="moduleSwitch"><option value="">Switch module…</option>'+
      Object.entries(NAV).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join("")+
      '</select><button class="qbtn" data-action="back">← Previous</button>'+
      '<span class="actionHint">Search, filter, create and inspect records from this screen</span></div>';
  }

  function header(title,desc,actionText){
    return '<div class="moduleHead"><div><div class="eyebrow">ERP MODULE • LIVE WORKSPACE</div><h1>'+esc(title)+'</h1><div class="muted">'+esc(desc)+'</div></div>'+
      '<div class="moduleActions"><button class="btn dark" data-create="'+esc(actionText||"New Record")+'">＋ '+esc(actionText||"New Record")+'</button></div></div>'+switchBar();
  }

  function toolbar(filters=[]){
    return '<div class="moduleTools"><div class="toolSearch">⌕ <input id="moduleSearch" placeholder="Search records..." value="'+esc(state.query)+'"></div>'+
      '<select id="statusFilter"><option>All</option>'+filters.map(x=>'<option>'+esc(x)+'</option>').join("")+'</select>'+
      '<button class="btn" data-action="clear">Reset</button></div>';
  }

  function table(headers,rows,empty="No records found."){
    if(!rows.length) return '<div class="tableWrap"><div class="empty">'+esc(empty)+'</div></div>';
    return '<div class="tableWrap"><table class="table"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join("")+
      '</tr></thead><tbody>'+rows.map((r,i)=>'<tr data-row="'+i+'">'+r.map((x,j)=>'<td>'+(j===r.length-1?pill(x):esc(x))+'</td>').join("")+'</tr>').join("")+
      '</tbody></table></div>';
  }

  function filterRows(rows){
    const q=state.query.toLowerCase();
    return rows.filter(r=>(!q||r.join(" ").toLowerCase().includes(q))&&(state.filter==="All"||r.includes(state.filter)));
  }

  function generic(title,desc,action,stats,headers,rows,filters=[]){
    return header(title,desc,action)+'<div class="statGrid">'+stats.map(s=>kpi(...s)).join("")+'</div>'+
      toolbar(filters)+table(headers,filterRows(rows));
  }

  function dashboard(){
    return '<div class="top"><div><div class="eyebrow">CONTROL CENTER</div><h2>Trading Operations</h2></div><div class="topRight"><div class="search">⌕ Global ERP search</div><div class="date">21 Sep 2026 • Live</div></div></div>'+
    '<section class="hero"><h1>Good morning.</h1><p>One workspace for supply intelligence, deals, inventory, buyers, sellers, dispatch and profitability.</p><span class="badge pulse">● SYSTEM ONLINE</span></section>'+
    '<div class="grid6">'+kpi("Open Deals","24","↑ 6 this week")+kpi("Opportunities","41","14 hot signals")+kpi("Buyer Demands","36","9 urgent")+kpi("Inventory Value","₹8.4 Cr","↑ 4.8%")+kpi("Receivables","₹2.1 Cr","12 invoices open","warn")+kpi("Payables","₹1.3 Cr","8 invoices open")+'</div>'+
    '<div class="trading"><div class="trade"><div><div class="lab">TODAY PURCHASE</div><div class="num">₹18.5L</div><small>6 transactions</small></div><div class="bar"><i style="width:68%"></i></div></div>'+
    '<div class="trade"><div><div class="lab">TODAY SALES</div><div class="num">₹26.2L</div><small>8 transactions</small></div><div class="bar"><i style="width:82%"></i></div></div>'+
    '<div class="trade"><div><div class="lab">TODAY PROFIT</div><div class="num">₹4.1L</div><small>15.6% blended margin</small></div><div class="bar"><i style="width:74%"></i></div></div></div>'+
    '<div class="quickbar"><button class="qbtn" data-create="New Deal">＋ New Deal</button><button class="qbtn" data-create="New Opportunity">＋ Opportunity</button><button class="qbtn" data-create="New Buyer Demand">＋ Buyer Demand</button><button class="qbtn" data-action="inventory">▦ Check Inventory</button><button class="qbtn" data-action="reports">▥ Open Reports</button></div>'+
    '<div class="content"><section class="panel"><div class="panelHead"><h3>Priority Deals</h3><button class="btn" data-action="deals">View all</button></div>'+
    '<div class="list">'+state.data.deals.map(d=>'<div class="row clickable" data-deal="'+esc(d[0])+'"><div><b>'+esc(d[0])+' • '+esc(d[1])+'</b><small>'+esc(d[2])+' → '+esc(d[3])+' • '+esc(d[4])+' • Buy '+esc(d[5])+' → Sell '+esc(d[6])+'</small></div>'+pill(d[7])+'</div>').join("")+'</div></section>'+
    '<section class="panel"><div class="panelHead"><h3>Action Center</h3><span class="muted">Needs attention</span></div><div class="list">'+
    '<div class="row clickable" data-action="deals"><div><b>4 deals have capital exposure</b><small>Seller committed, buyer not yet confirmed.</small></div>'+pill("EXPOSURE")+'</div>'+
    '<div class="row clickable" data-action="demands"><div><b>9 urgent buyer demands</b><small>Match against live supply signals.</small></div>'+pill("URGENT")+'</div>'+
    '<div class="row clickable" data-action="payments"><div><b>12 receivables pending</b><small>Review due dates and collections.</small></div>'+pill("PAYMENTS")+'</div></div></section></div>'+
    '<section class="coming"><div class="eyebrow" style="color:#a5b4fc">ROADMAP • UPCOMING</div><h3 style="margin:5px 0 0;font-size:17px">Next ERP capabilities</h3><div class="comingGrid">'+
    [["Agreement Center","Structured seller/buyer agreements, signatures and amendments."],["Deal Profitability","Expected vs actual landed cost, margin, profit/kg and variance."],["Payments & Ledger","Receivables, payables, due dates and collections."],["Audit & Notifications","Approvals, activity history and operational alerts."]].map(x=>'<div class="comingCard"><b>'+x[0]+'</b><small>'+x[1]+'</small></div>').join("")+
    '</div></section>';
  }

  function intelligence(){
    return header("Market Intelligence","Turn raw market information into structured supply, demand and pricing signals.","Add Signal")+
      '<div class="statGrid">'+kpi("Supply Signals","41","Active opportunities")+kpi("Buyer Signals","36","Open demands")+kpi("Price Records","128","Last 30 days")+kpi("Potential Matches","17","Ready for review")+'</div>'+
      toolbar(["Hot","Open","Urgent","Watch"])+table(["Signal","Company","Material","Qty","Rate","Type","Status"],filterRows([
        ["MI-2201","ABC Steel Ltd.","E250 Plate","20 MT","₹48–52/kg","Supply","Hot"],
        ["MI-2202","PQR Engineering","HR Coil","40 MT","₹45–49/kg","Supply","Open"],
        ["MI-2203","XYZ Industries","E250 Plate","20 MT","Target ₹50/kg","Demand","Urgent"],
        ["MI-2204","LMN Industries","MS Plate","100 MT","Target ₹55/kg","Demand","Open"]
      ]))+
      '<div class="notice">SOURCE → MATERIAL → QUANTITY → MARKET RATE → BUYER DEMAND → MATCH → DEAL</div>';
  }

  function renderModule(){
    const rows={
      opportunities:()=>generic("Material Opportunities","Seller-side surplus, dead-stock and corporate purchase opportunities.","Add Opportunity",[["Total","41","Open supply signals"],["Hot","14","Needs quick action"],["Open","18","Not yet converted"],["Watch","9","Monitoring"]],["ID","Material","Seller / Source","Qty","Asking","Market","Status","Source Type"],state.data.opportunities,["Hot","Open","Watch"]),
      demands:()=>generic("Buyer Demands","Capture buyer requirements before matching supply.","Add Demand",[["Open Demands","36","Active requirements"],["Urgent","9","Required soon"],["Matched","17","Linked to supply"],["Unmatched","19","Needs sourcing"]],["Demand","Buyer","Material","Qty","Target Rate","Required By","Status"],state.data.demands,["Urgent","Open"]),
      deals:()=>generic("Deal Management","Central business object linking seller, buyer, material, purchase, stock, sale and profit.","Create Deal",[["Open Deals","24","All active"],["Seller Committed","12","Supply locked"],["Buyer Committed","7","Demand locked"],["Capital Exposure","4","Seller only"]],["Deal","Material","Seller","Buyer","Qty","Buy","Sell","Status","Agreement"],state.data.deals,["Committed","Opportunity","Execution"]),
      buyers:()=>generic("Customers & Buyers","Companies that consume materials, place requirements and purchase from you.","Add Buyer",[["Total Buyers","184","Master records"],["Active","137","Trading regularly"],["Open Demands","36","Requirements"],["Receivables","₹2.1 Cr","Outstanding"]],["Buyer","City","Active Demands","Last Purchase","Credit","Status"],state.data.buyers,["Active"]),
      sellers:()=>generic("Sellers & Suppliers","Factories, surplus holders and regular suppliers who can provide material.","Add Seller",[["Total Sources","96","Seller records"],["Surplus Sources","61","Dead-stock holders"],["Active Signals","41","Current supply"],["Payables","₹1.3 Cr","Outstanding"]],["Seller","City","Supply Signals","Last Purchase","Reliability","Status"],state.data.sellers,["Active"]),
      materials:()=>generic("Material Master","Standardized material, grade, specification, unit and market classification.","Add Material",[["Materials","428","Master records"],["Active","412","Usable"],["Grades","74","Standardized"],["Mapped","96%","Specifications"]],["Code","Material","Grade","Specification","Unit","Active"],state.data.materials,["Yes"]),
      procurement:()=>generic("Procurement","Purchase from surplus sellers, direct corporate sources and regular suppliers.","New Purchase",[["Today Purchase","₹18.5L","6 transactions"],["Pending Receipts","8","Shipments"],["Capital Blocked","₹32L","Incoming stock"],["Vendors","86","Active sources"]],["Purchase","Type","Seller","Material","Qty","Buy Rate","Status"],[
        ["PO-8001","Surplus / Dead Stock","ABC Steel Ltd.","E250 Plate","20 MT","₹35/kg","Received"],
        ["PO-8002","Direct Corporate","Direct Corporate","MS Plate","100 MT","₹52/kg","In Transit"],
        ["PO-8003","Regular Supplier","Steel Supplier A","HR Coil","40 MT","₹41/kg","Draft"]
      ],["Received","In Transit","Draft"]),
      inventory:()=>generic("Inventory","Central stock ledger with source, cost, warehouse, reservation and deal linkage.","Add Stock",[["Available","₹5.8 Cr","Current stock"],["Reserved","₹1.4 Cr","Committed"],["Incoming","₹1.2 Cr","In transit"],["Blocked","₹18L","Exceptions"]],["Stock","Material","Warehouse","Qty","Cost","Status","Linked Deal"],[
        ["ST-4401","E250 Plate","Main Yard","20 MT","₹35/kg","Reserved","D-001245"],
        ["ST-4402","MS Plate","Main Yard","100 MT","₹52/kg","Available","D-001247"],
        ["ST-4403","HR Coil","Transit Yard","40 MT","₹40/kg","Incoming","D-001246"]
      ],["Available","Reserved","Incoming","Blocked"]),
      sales:()=>generic("Sales & Dispatch","Buyer orders, allocation, dispatch and delivery tracking.","New Sales Order",[["Today Sales","₹26.2L","8 orders"],["Ready","₹14.8L","Dispatch queue"],["Dispatched","₹7.4L","On route"],["Delivered","₹4.0L","Completed"]],["Order","Buyer","Material","Qty","Sell Rate","Dispatch","Status"],[
        ["SO-6101","XYZ Industries","E250 Plate","20 MT","₹50/kg","24 Sep","Ready"],
        ["SO-6102","LMN Industries","MS Plate","100 MT","₹55/kg","26 Sep","Planned"],
        ["SO-6103","Buyer B","HR Coil","15 MT","₹49/kg","22 Sep","Dispatched"]
      ],["Ready","Planned","Dispatched","Delivered"]),
      warehouses:()=>generic("Warehouses","Physical and external storage locations for owned inventory.","Add Warehouse",[["Locations","3","Active"],["Stock Value","₹8.4 Cr","Total"],["Utilization","64%","Blended"],["Incoming","₹1.2 Cr","Transit"]],["Warehouse","City","Capacity","Current Value","Utilization","Status"],[
        ["Main Yard","Rohtak","500 MT","₹5.8 Cr","72%","Active"],["Transit Yard","Panipat","200 MT","₹1.2 Cr","48%","Active"],["External Storage","Delhi NCR","300 MT","₹1.4 Cr","51%","Active"]
      ],["Active"]),
      payments:()=>generic("Payments & Ledger","Receivables, payables and payment status across purchases and sales.","Record Payment",[["Receivables","₹2.1 Cr","Outstanding"],["Payables","₹1.3 Cr","Outstanding"],["Overdue","₹28L","Needs follow-up"],["Collected Today","₹9.4L","Received"]],["Entry","Party","Type","Reference","Amount","Due","Status"],[
        ["PAY-901","XYZ Industries","Receivable","SO-6101","₹10L","28 Sep","Pending"],["PAY-902","ABC Steel Ltd.","Payable","PO-8001","₹7L","24 Sep","Pending"],["PAY-903","LMN Industries","Receivable","SO-6102","₹55L","30 Sep","Part Paid"],["PAY-904","Steel Supplier A","Payable","PO-8003","₹16.4L","26 Sep","Open"]
      ],["Pending","Part Paid","Open"]),
      documents:()=>generic("Documents","Central repository linked to deals, purchases, sales and agreements.","Upload Document",[["Documents","486","Stored"],["Verified","451","Checked"],["Pending","35","Needs review"],["Storage","2.4 GB","Current"]],["Document","Linked To","Type","Uploaded","Owner","Status"],[
        ["DOC-701","D-001245","Seller Agreement","20 Sep","Admin","Verified"],["DOC-702","PO-8001","Purchase Invoice","20 Sep","Finance","Verified"],["DOC-703","SO-6101","Dispatch Note","21 Sep","Operations","Pending"],["DOC-704","D-001247","Buyer Agreement","19 Sep","Sales","Verified"]
      ],["Verified","Pending"]),
      company:()=>generic("Company & Users","Organization settings, users, roles and access control.","Add User",[["Users","18","Active accounts"],["Roles","7","RBAC roles"],["Companies","1","Current tenant"],["Audit Events","2,841","Recorded"]],["User","Email","Role","Last Active","Status"],[
        ["Admin","admin@company.local","Administrator","Now","Active"],["Sales Manager","sales@company.local","Sales","Today","Active"],["Procurement","purchase@company.local","Procurement","Today","Active"],["Finance","finance@company.local","Finance","Yesterday","Active"]
      ],["Active"])
    };
    if(state.key==="dashboard") return dashboard();
    if(state.key==="intelligence") return intelligence();
    return rows[state.key]?rows[state.key]():dashboard();
  }

  function modal(title,type){
    const configs={
      "New Deal":["Deal Reference","Material","Quantity","Buy Rate","Sell Rate","Seller","Buyer"],
      "New Opportunity":["Opportunity Reference","Material","Quantity","Asking Rate","Market Rate","Seller / Source","Location"],
      "New Buyer Demand":["Demand Reference","Material","Quantity","Target Rate","Required By","Buyer","Location"],
      "Add Signal":["Signal Reference","Company","Material","Quantity","Market Rate","Type","Status"],
      "New Purchase":["Purchase Reference","Material","Quantity","Buy Rate","Purchase Type","Seller","Warehouse"],
      "Add Stock":["Stock Reference","Material","Quantity","Cost","Warehouse","Status","Deal"],
      "New Sales Order":["Order Reference","Buyer","Material","Quantity","Sell Rate","Dispatch Date","Status"],
      "Add Buyer":["Company Name","City","Phone","Email","Credit Limit","Status"],
      "Add Seller":["Company Name","City","Phone","Email","Category","Status"],
      "Add Material":["Material Code","Material","Grade","Specification","Unit","Status"],
      "Add Warehouse":["Warehouse Name","City","Capacity","Manager","Status"],
      "Record Payment":["Party","Reference","Type","Amount","Due Date","Status"],
      "Upload Document":["Document Name","Linked Reference","Type","Owner","Status"],
      "Add User":["Name","Email","Role","Phone","Status"]
    };
    const fields=configs[type]||["Name","Reference","Notes"];
    const html='<div class="modalBack" id="modal"><div class="modal"><div class="modalHead"><div><div class="eyebrow">NEW RECORD</div><h3>'+esc(title)+'</h3></div><button class="btn" data-close>✕</button></div><div class="modalBody"><div class="formGrid">'+
      fields.map((f,i)=>'<div class="field"><label>'+esc(f)+'</label><input data-field="'+esc(f)+'" placeholder="'+esc("Enter "+f.toLowerCase())+'"></div>').join("")+
      '</div></div><div class="modalFoot"><button class="btn" data-close>Cancel</button><button class="btn dark" data-save>Save Record</button></div></div></div>';
    document.body.insertAdjacentHTML("beforeend",html);
    document.querySelector("#modal [data-save]").onclick=()=>saveRecord(type);
    document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);
  }

  function saveRecord(type){
    const inputs=[...document.querySelectorAll("#modal [data-field]")];
    const values=inputs.map(x=>x.value.trim()||"—");
    const map={
      "New Deal":["D-"+String(Date.now()).slice(-6),values[1],values[5],values[6],values[2],values[3],values[4],"Opportunity","Seller only"],
      "New Opportunity":["OP-"+String(Date.now()).slice(-6),values[1],values[5],values[2],values[3],values[4],"Open","Surplus / Dead Stock"],
      "New Buyer Demand":["DM-"+String(Date.now()).slice(-6),values[5],values[1],values[2],values[3],values[4],"Open"],
      "Add Buyer":[values[0],values[1],"0","—",values[4],values[5]],
      "Add Seller":[values[0],values[1],"0","—","New",values[5]],
      "Add Material":["MAT-"+String(Date.now()).slice(-4),values[1],values[2],values[3],values[4],values[5]]
    };
    const target={"New Deal":"deals","New Opportunity":"opportunities","New Buyer Demand":"demands","Add Buyer":"buyers","Add Seller":"sellers","Add Material":"materials"}[type];
    if(target){state.data[target].unshift(map[type]);saveData(target);}
    closeModal(); toast("Saved "+type+" • preview data updated"); render();
  }

  function closeModal(){document.getElementById("modal")?.remove();}
  function toast(msg){
    document.querySelector(".toast")?.remove();
    const d=document.createElement("div");d.className="toast";d.textContent=msg;document.body.appendChild(d);
    setTimeout(()=>d.remove(),2400);
  }

  function inspect(row){
    const cells=[...row.children].map(x=>x.textContent.trim());
    const b=document.createElement("div");b.className="modalBack";b.id="modal";
    b.innerHTML='<div class="modal"><div class="modalHead"><div><div class="eyebrow">RECORD</div><h3>Record details</h3></div><button class="btn" data-close>✕</button></div><div class="modalBody">'+
      cells.map((x,i)=>'<div class="detailLine"><span>FIELD '+(i+1)+'</span><b>'+esc(x)+'</b></div>').join("")+
      '</div><div class="modalFoot"><button class="btn" data-close>Close</button><button class="btn dark" data-edit>Edit record</button></div></div>';
    document.body.appendChild(b);b.querySelector("[data-close]").onclick=closeModal;b.querySelector("[data-edit]").onclick=()=>toast("Edit workflow ready for backend connection");
  }

  function render(){
    try{
      state.key=location.hash.slice(1)||"dashboard";
      if(!NAV[state.key]) state.key="dashboard";
      nav();
      document.getElementById("app").innerHTML=renderModule();
      bind();
    }catch(err){
      console.error(err);
      document.getElementById("app").innerHTML='<div class="errorPanel"><h2>ERP workspace error</h2><p>The module failed to render. The navigation is still available.</p><button class="btn dark" onclick="location.reload()">Reload workspace</button></div>';
    }
  }

  function bind(){
    document.querySelectorAll("[data-action]").forEach(el=>el.onclick=()=>{
      const a=el.dataset.action;
      if(a==="dashboard"||NAV[a]){location.hash="#"+a;return;}
      if(a==="back"){history.back();return;}
      if(a==="clear"){state.query="";state.filter="All";render();return;}
    });
    document.querySelectorAll("[data-create]").forEach(el=>el.onclick=()=>modal(el.dataset.create,el.dataset.create));
    const search=document.getElementById("moduleSearch");
    if(search){search.oninput=e=>{state.query=e.target.value;render();const s=document.getElementById("moduleSearch");s?.focus();s?.setSelectionRange(state.query.length,state.query.length);};}
    const filter=document.getElementById("statusFilter");
    if(filter){filter.value=state.filter;filter.onchange=e=>{state.filter=e.target.value;render();};}
    const sw=document.getElementById("moduleSwitch");
    if(sw)sw.onchange=e=>{if(e.target.value)location.hash="#"+e.target.value;};
    document.querySelectorAll("tbody tr").forEach(r=>r.onclick=()=>inspect(r));
    document.querySelectorAll("[data-deal]").forEach(r=>r.onclick=()=>{const d=state.data.deals.find(x=>x[0]===r.dataset.deal);if(d)inspect(document.createElement("tr"));});
  }

  function injectCss(){
    if(document.getElementById("erp-interaction-css"))return;
    const s=document.createElement("style");s.id="erp-interaction-css";s.textContent=
      ".moduleTools{display:flex;gap:9px;margin:0 0 13px;align-items:center;flex-wrap:wrap}.toolSearch{display:flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:0 11px;min-width:280px}.toolSearch input{border:0;outline:0;padding:9px 0;width:240px}.moduleTools select{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 12px;color:#475569}.quickbar{display:flex;gap:8px;align-items:center;margin:0 0 14px;flex-wrap:wrap}.qbtn{border:1px solid var(--line);background:#fff;color:#475569;border-radius:10px;padding:8px 11px;font-size:11px;font-weight:750;cursor:pointer}.qbtn:hover{background:#eef2ff;color:#4338ca}.qselect{border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 11px}.actionHint{font-size:10px;color:#94a3b8;margin-left:auto}.modalBack{position:fixed;inset:0;background:#02061799;backdrop-filter:blur(4px);z-index:999;display:grid;place-items:center;padding:20px}.modal{width:min(650px,100%);background:#fff;border-radius:20px;box-shadow:0 25px 80px #02061755;overflow:hidden}.modalHead{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--line)}.modalHead h3{margin:3px 0 0;font-size:17px}.modalBody{padding:20px}.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field label{display:block;font-size:10px;font-weight:800;color:#64748b;margin-bottom:5px}.field input{width:100%;border:1px solid #dbe3ed;border-radius:9px;padding:10px;outline:none}.field input:focus{border-color:#818cf8;box-shadow:0 0 0 3px #6366f11a}.modalFoot{padding:14px 20px;background:#f8fafc;display:flex;justify-content:flex-end;gap:8px}.detailLine{display:flex;justify-content:space-between;gap:20px;padding:11px 0;border-bottom:1px solid #eef2f7;font-size:12px}.detailLine span{font-size:9px;color:#94a3b8;font-weight:800}.toast{position:fixed;right:22px;bottom:22px;background:#111827;color:#fff;padding:11px 15px;border-radius:11px;z-index:1000;box-shadow:0 12px 35px #0004;font-size:11px}.errorPanel{margin:30px;background:#fff1f2;border:1px solid #fecdd3;border-radius:16px;padding:25px;color:#881337}.coming{margin-top:15px;background:linear-gradient(135deg,#0f172a,#172554);border-radius:18px;padding:18px;color:#fff}.comingGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}.comingCard{background:#ffffff0b;border:1px solid #ffffff14;border-radius:12px;padding:12px}.comingCard b{font-size:11px}.comingCard small{display:block;color:#aebbd0;margin-top:4px;font-size:9px}@media(max-width:900px){.formGrid,.comingGrid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.formGrid,.comingGrid{grid-template-columns:1fr}.toolSearch{min-width:100%}.actionHint{width:100%;margin-left:0}}";
    document.head.appendChild(s);
  }

  loadData();
  injectCss();
  window.addEventListener("hashchange",render);
  window.addEventListener("load",render);
  render();
})();