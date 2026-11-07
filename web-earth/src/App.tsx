import { Hero } from "./components/Hero";
import { Send } from "./components/Send";
import { Closing, Faq, Footer, Navbar, Protect, Save, Statement } from "./components/Sections";

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Statement />
        <Save />
        <Send />
        <Protect />
        <Faq />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
