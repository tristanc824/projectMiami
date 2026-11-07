import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Cards, Closing, Footer, Keep, Moments, Stories, Trust } from "./components/Brand";

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Stories />
        <Moments />
        <Trust />
        <Keep />
        <Cards />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
