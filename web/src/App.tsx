import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { TrustStrip } from "./components/TrustStrip";
import { Pillars } from "./components/Pillars";
import { Hedge } from "./components/Hedge";
import { Send } from "./components/Send";
import { Faq } from "./components/Faq";
import { Closing } from "./components/Closing";
import { Footer } from "./components/Footer";
import { useSiteMotion } from "./lib/motion";

/** A light seam between sections, so they hand off instead of hard-cutting. */
const Seam = () => <div className="seam" aria-hidden />;

export default function App() {
  useSiteMotion();
  return (
    <>
      <a href="#account" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-carbon">
        Skip to content
      </a>
      <Navbar />
      <main>
        <Hero />
        <TrustStrip />
        <Pillars />
        <Seam />
        <Hedge />
        <Seam />
        <Send />
        <Seam />
        <Faq />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
