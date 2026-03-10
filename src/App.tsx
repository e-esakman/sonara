import CustomCursor from './components/CustomCursor';
import Navigation from './components/Navigation';
import Hero from './sections/Hero';
import HowItWorks from './sections/HowItWorks';
import Trainer from './sections/Trainer';
import Features from './sections/Features';
import Progress from './sections/Progress';
import Accessibility from './sections/Accessibility';
import FAQSection from './sections/FAQSection';
import Footer from './sections/Footer';
import Reader from './sections/Reader';

function App() {
  return (
    <>
      <CustomCursor />
      <Navigation />
      <Hero />
      <HowItWorks />
      <Trainer />
      <Reader />
      <Features />
      <Progress />
      <Accessibility />
      <FAQSection />
      <Footer />
    </>
  );
}

export default App;
