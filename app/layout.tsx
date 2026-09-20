import "./globals.css";
export const metadata = { title: "ERP — Steel Trading", description: "Centralized enterprise trading ERP" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }