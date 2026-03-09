import Hero from './sections/Hero';
import Trainer from './sections/Trainer';
import FAQSection from './sections/FAQSection';
import Footer from './sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-bg text-text font-body selection:bg-pink-500/30 overflow-x-hidden">
      <Hero />
      <div className="max-w-[1200px] mx-auto px-6 pb-24 space-y-24 relative z-10">
        <Trainer />
        <FAQSection />
      </div>
      <Footer />
    </div>
  );
}

export default App;
