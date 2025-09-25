import Hero from '@/components/Hero'
import Features from '@/components/Features'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Dashboard />
    </div>
  )
}