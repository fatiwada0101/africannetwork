import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { LanguageProvider } from "./context/LanguageContext";

export const metadata = {
  title: "African Network — Wi-Fi Pass & Wallet",
  description: "Buy Wi-Fi vouchers instantly. Fund your wallet, purchase hotspot passes, and connect in seconds.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#141417",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="African Network Wi-Fi" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="African Network Wi-Fi" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <BrandingProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </BrandingProvider>
        </AuthProvider>
        <Script src="https://checkout.flutterwave.com/v3.js" strategy="lazyOnload" />
        <Script src="https://sdk.monnify.com/plugin/monnify.js" strategy="lazyOnload" />
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('SW registration note:', err.message);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
