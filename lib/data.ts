import type { DashboardData, Deal } from "./types";
export const dashboardData: DashboardData = { openDeals:24, opportunities:41, buyerDemands:36, inventoryValue:84000000, receivables:21000000, payables:13000000, todayPurchase:1850000, todaySales:2620000, todayProfit:410000 };
export const deals: Deal[] = [
{id:"D-001245",material:"E250 Plate",grade:"IS 2062 E250",quantity:20,unit:"MT",seller:"ABC Steel Ltd.",buyer:"XYZ Industries",buyRate:35,sellRate:50,status:"Committed",procurementType:"Surplus / Dead Stock",agreementSeller:true,agreementBuyer:true},
{id:"D-001246",material:"HR Coil",grade:"IS 2062",quantity:40,unit:"MT",seller:"PQR Engineering",buyRate:40,status:"Opportunity",procurementType:"Surplus / Dead Stock",agreementSeller:false,agreementBuyer:false},
{id:"D-001247",material:"MS Plate",grade:"E250",quantity:100,unit:"MT",seller:"Direct Corporate Supplier",buyer:"LMN Industries",buyRate:52,sellRate:55,status:"In Execution",procurementType:"Direct Corporate",agreementSeller:true,agreementBuyer:true}
];