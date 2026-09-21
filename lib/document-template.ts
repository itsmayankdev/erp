import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export type DocumentType = "PURCHASE_ORDER"|"SALES_ORDER"|"INVOICE"|"QUOTATION";
export type DocumentData = { type:DocumentType; number:string; date:Date; company:any; party:any; item:any[]; subtotal:number; discount:number; tax:number; total:number; paymentTerms?:string; deliveryTerms?:string; notes?:string; terms?:string };
export function titleFor(t:DocumentType){return ({PURCHASE_ORDER:"PURCHASE ORDER",SALES_ORDER:"SALES ORDER",INVOICE:"TAX INVOICE",QUOTATION:"QUOTATION"} as any)[t]||"ERP DOCUMENT"}
const money=(n:number)=>"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const safe=(v:any)=>v===undefined||v===null||v===""?"—":String(v);
const address=(c:any)=>[c.address,c.city,c.state,c.pincode].filter(Boolean).join(", ")||"Company address not configured";
export function buildSvg(d:DocumentData){
  const esc=(v:any)=>safe(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const rows=d.item.map((x,i)=>"<tr><td>"+(i+1)+"</td><td><b>"+esc(x.name)+"</b><br><span>"+esc([x.code,x.grade,x.specification].filter(Boolean).join(" · "))+"</span></td><td>"+x.quantity.toLocaleString("en-IN")+"</td><td>"+esc(x.unit)+"</td><td>"+money(x.rate)+"</td><td>"+x.discount+"%</td><td>"+money(x.quantity*x.rate*(1-x.discount/100))+"</td></tr>").join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"><rect width="794" height="1123" fill="white"/><rect x="32" y="32" width="730" height="1059" fill="none" stroke="#d9e0e8"/>'+
    '<text x="55" y="72" font-family="Arial" font-size="20" font-weight="700" fill="#172a42">'+esc(d.company.name)+'</text>'+
    '<text x="55" y="94" font-family="Arial" font-size="9" fill="#64748b">'+esc(address(d.company))+'</text>'+
    '<text x="735" y="76" text-anchor="end" font-family="Arial" font-size="18" font-weight="700" fill="#1f5fc9">'+titleFor(d.type)+'</text>'+
    '<text x="735" y="96" text-anchor="end" font-family="Arial" font-size="10" fill="#475569">No. '+esc(d.number)+'</text><text x="735" y="112" text-anchor="end" font-family="Arial" font-size="10" fill="#475569">Date: '+d.date.toLocaleDateString("en-IN")+'</text>'+
    '<line x1="55" y1="130" x2="739" y2="130" stroke="#d9e0e8"/><rect x="55" y="150" width="330" height="86" rx="6" fill="#f6f8fb"/>'+
    '<text x="70" y="172" font-family="Arial" font-size="9" font-weight="700" fill="#64748b">PARTY</text><text x="70" y="194" font-family="Arial" font-size="13" font-weight="700" fill="#172a42">'+esc(d.party?.name)+'</text>'+
    '<foreignObject x="55" y="255" width="684" height="390"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial;font-size:9px"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#172a42;color:#fff"><th>#</th><th style="text-align:left">Item</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Disc.</th><th>Amount</th></tr></thead><tbody>'+rows+'</tbody></table></div></foreignObject>'+
    '<text x="500" y="700" font-family="Arial" font-size="10" fill="#64748b">Subtotal</text><text x="735" y="700" text-anchor="end" font-family="Arial" font-size="10">'+money(d.subtotal)+'</text>'+
    '<text x="500" y="722" font-family="Arial" font-size="10" fill="#64748b">Discount</text><text x="735" y="722" text-anchor="end" font-family="Arial" font-size="10">-'+money(d.discount)+'</text>'+
    '<text x="500" y="744" font-family="Arial" font-size="10" fill="#64748b">Tax</text><text x="735" y="744" text-anchor="end" font-family="Arial" font-size="10">'+money(d.tax)+'</text>'+
    '<rect x="475" y="760" width="264" height="42" rx="5" fill="#eef5ff"/><text x="490" y="786" font-family="Arial" font-size="11" font-weight="700">TOTAL</text><text x="725" y="786" text-anchor="end" font-family="Arial" font-size="15" font-weight="700" fill="#1f5fc9">'+money(d.total)+'</text>'+
    '<text x="55" y="700" font-family="Arial" font-size="9" font-weight="700" fill="#64748b">TERMS &amp; NOTES</text><text x="55" y="720" font-family="Arial" font-size="9" fill="#475569">'+esc(d.terms||d.notes||"")+'</text>'+
    '<line x1="55" y1="930" x2="300" y2="930" stroke="#94a3b8"/><text x="55" y="948" font-family="Arial" font-size="9" fill="#64748b">Authorized Signatory</text></svg>';
}
export async function buildPdf(d:DocumentData){
 const pdf=await PDFDocument.create(); const page=pdf.addPage([595,842]); const font=await pdf.embedFont(StandardFonts.Helvetica); const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const blue=rgb(.12,.37,.79),dark=rgb(.09,.16,.25),muted=rgb(.38,.44,.51),line=rgb(.85,.88,.91);
 const t=(s:string,x:number,y:number,size=8,f=font,color=dark)=>page.drawText(s,{x,y,size,font:f,color});
 t(safe(d.company.name),40,800,16,bold); t(address(d.company),40,785,7,font,muted); t(titleFor(d.type),410,800,14,bold,blue); t("No. "+d.number,410,784,8,font,muted); t("Date: "+d.date.toLocaleDateString("en-IN"),410,772,8,font,muted); page.drawLine({start:{x:40,y:755},end:{x:555,y:755},thickness:1,color:line});
 page.drawRectangle({x:40,y:680,width:250,height:55,color:rgb(.965,.975,.985)}); t("PARTY",52,717,7,bold,muted); t(safe(d.party?.name),52,700,10,bold); t(address(d.party||{}),52,687,7,font,muted);
 let y=635; page.drawRectangle({x:40,y:y-14,width:515,height:20,color:dark}); ["#","ITEM","QTY","UNIT","RATE","DISC","AMOUNT"].forEach((h,i)=>t(h,[40,60,325,375,410,470,515][i],y-8,7,bold,undefined as any,rgb(1,1,1))); y-=28;
 d.item.forEach((x,i)=>{const amount=x.quantity*x.rate*(1-x.discount/100); t(String(i+1),40,y,7); t(safe(x.name).slice(0,42),60,y,7); t(x.quantity.toLocaleString("en-IN"),325,y,7); t(x.unit,375,y,7); t(money(x.rate),410,y,7); t(x.discount+"%",470,y,7); t(money(amount),515,y,7); y-=22; page.drawLine({start:{x:40,y:y+10},end:{x:555,y:y+10},thickness:.5,color:line});});
 y=Math.max(y,380); t("Subtotal",410,y,8,font,muted); t(money(d.subtotal),515,y,8); y-=18; t("Discount",410,y,8,font,muted); t("-"+money(d.discount),515,y,8); y-=18; t("Tax",410,y,8,font,muted); t(money(d.tax),515,y,8); y-=25; page.drawRectangle({x:400,y:y-7,width:155,height:28,color:rgb(.93,.96,1)}); t("TOTAL",412,y+3,9,bold); t(money(d.total),490,y+3,10,bold,undefined as any,blue);
 y-=55; t("TERMS & NOTES",40,y,8,bold,muted); y-=15; t(safe(d.terms||d.notes),40,y,7,font,muted); t("Authorized Signatory",40,90,8,font,muted); page.drawLine({start:{x:40,y:105},end:{x:190,y:105},thickness:.7,color:muted}); t("Generated by Steel Trading ERP",40,45,6,font,muted);
 return pdf.save();
}