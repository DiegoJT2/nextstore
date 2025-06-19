import { Geist, Geist_Mono } from "next/font/google";
import { CarritoProvider } from "@/context/carritocontext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tienda Deportiva",
  description: "Tienda Deportiva",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <CarritoProvider>
          {children}
        </CarritoProvider>
      </body>
    </html>
  );
}