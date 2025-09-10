import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col font-sans antialiased bg-gray-50">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster position="top-right" richColors />
    </div>
  );
}
