import "./globals.css";
import Nav from "./_components/Nav";
import Footer from "./_components/Footer";
import OfferBanner from "./_components/OfferBanner";
import OfferPopup from "./_components/OfferPopup";

export const metadata = {
  title: "Room30 — Find your next room in Jaipur",
  description: "Monthly rental marketplace. Search rooms, PGs, and flats. Chat with owners, unlock contacts.",
};

// Runs before React hydrates — prevents dark-mode flash.
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('r30-theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = (t === 'dark' || t === 'light') ? t : (sys ? 'dark' : 'light');
    var root = document.documentElement;
    if (resolved === 'dark') root.classList.add('dark');
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;
  } catch(_) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0b0f1a" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)] selection:bg-indigo-500 selection:text-white">
        <OfferBanner />
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <OfferPopup />
      </body>
    </html>
  );
}
