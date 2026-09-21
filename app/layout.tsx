import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = { title: "ERP — Steel Trading", description: "Centralized enterprise trading ERP" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Sidebar /><div className="appContent">{children}</div></body></html>;
}