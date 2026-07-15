import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'CRMS — Change Request Management',
    template: '%s | CRMS',
  },
  description:
    'Professional change request management system for tracking and approving project changes.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning={true}
    >
      <body
        className="min-h-full flex flex-col bg-slate-50/50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-200"
        suppressHydrationWarning={true}
      >
        <Script
          id="hydration-console-patch"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  var __origConsoleError = console.error;
                  var HYDRATION_ERROR_PATTERNS = ['hydration','server rendered html','content did not match','bis_skin_checked'];
                  function isHydrationError() {
                    var message = Array.prototype.slice.call(arguments)
                      .map(function(arg){ return typeof arg==='string'?arg:''; })
                      .join(' ')
                      .toLowerCase();
                    return HYDRATION_ERROR_PATTERNS.some(function(pattern){ return message.indexOf(pattern.toLowerCase())!==-1; });
                  }
                  console.error = function () {
                    if (typeof isHydrationError==='function' && isHydrationError.apply(this, arguments)) {
                      return;
                    }
                    __origConsoleError.apply(console, arguments);
                  };
                } catch (e) {}
              })();
            `,
          }}
        />
        <SplashScreen>{children}</SplashScreen>
      </body>
    </html>
  );
}
