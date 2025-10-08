"use client";

// This restored landing page mirrors the original version prior to the
// redirect change. It composes the marketing homepage using existing
// components from the ``components`` directory.  Each section is self‑contained
// and does not depend on any asynchronous data fetching.

import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import InteractiveDemo from '@/components/InteractiveDemo';
import Dashboard from '@/components/Dashboard';
import Features from '@/components/Features';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <InteractiveDemo />
      <Dashboard />
      <Features />
      <Contact />
      <Footer />
    </main>
  );
}
