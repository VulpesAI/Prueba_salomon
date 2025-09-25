"use client";

import Hero from '@/components/Hero'
import Navigation from '@/components/Navigation'
import Features from '@/components/Features'
import InteractiveDemo from '@/components/InteractiveDemo'
import Dashboard from '@/components/Dashboard'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

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
  )
}
