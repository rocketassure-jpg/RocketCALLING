import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Link } from "react-router-dom";
import { InstallPWA } from "@/components/InstallPWA";
import { PremiumCalculator } from "@/components/PremiumCalculator";
import { Heart, Stethoscope, Car, ShieldCheck, Phone, Clock, Award, MessageCircle, Calculator } from "lucide-react";

const WA_NUMBER = "919669762808";

const Index = () => {
  return (
    <div className="neon-root min-h-screen relative">
      <div className="neon-particles" aria-hidden="true" />

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="[&_span:last-child]:text-white [&_span:first-child]:!bg-black [&_svg]:!text-[hsl(var(--primary))]">
            <Logo />
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#enquiry" className="neon-link text-sm font-medium">Enquiry</a>
            <a href="#calculator" className="neon-link text-sm font-medium">Premium Calculator</a>
            <a href="#services" className="neon-link text-sm font-medium">Services</a>
            <a href="#why" className="neon-link text-sm font-medium">Why Us</a>
          </nav>
          <div className="flex items-center gap-2">
            <InstallPWA />
            <Button asChild size="sm" className="neon-btn-fill">
              <Link to="/auth">Staff Login</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden neon-bg">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <iframe
            className="absolute left-1/2 top-1/2 h-[300%] w-[300%] -translate-x-1/2 -translate-y-1/2 opacity-30"
            src="https://www.youtube.com/embed/Igjxvu7NOKw?autoplay=1&mute=1&loop=1&playlist=Igjxvu7NOKw&controls=0&rel=0&modestbranding=1&iv_load_policy=3"
            title="Rocket Services Insurance"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="absolute inset-0 z-10 bg-black/80" />

        <div className="relative z-20 container py-20">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full neon-glass px-4 py-1.5 text-xs font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5 neon-accent" /> Trusted by 10,000+ families
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl neon-text-glow">
              insurance expert
            </h1>
            <p className="mx-auto max-w-xl text-lg neon-muted">
              Life, health & motor insurance — tailored for Indian families. Get a free quote in 2 minutes from your local Rocket Services advisor.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="neon-btn-fill"><a href="#enquiry">Get a free quote</a></Button>
              <Button asChild size="lg" className="neon-btn-outline"><a href="#calculator"><Calculator className="h-4 w-4" /> Premium Calculator</a></Button>
              <Button asChild size="lg" className="neon-btn-cyan">
                <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Mujhe insurance ki jaankari chahiye")}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp Expert
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-4 text-sm">
              <div className="neon-glass flex items-center gap-2 px-4 py-2 text-white">
                <Award className="h-4 w-4 neon-accent" /> IRDAI certified
              </div>
              <div className="neon-glass neon-glass-cyan flex items-center gap-2 px-4 py-2 text-white">
                <Clock className="h-4 w-4 neon-cyan" /> 24×7 claim support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="enquiry" className="container py-16 neon-bg">
        <div className="mx-auto max-w-3xl neon-glass p-6 md:p-8">
          <EnquiryForm />
        </div>
      </section>

      {/* Premium Calculator */}
      <section id="calculator" className="py-16" style={{ background: "linear-gradient(180deg, #000 0%, #050a05 100%)" }}>
        <div className="container">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl neon-text-glow">Motor Insurance Premium Calculator</h2>
            <p className="mt-3 neon-muted">Apni car / bike ka premium 30 second mein calculate karein. PDF download ya WhatsApp pe direct share karein.</p>
          </div>
          <div className="neon-grad-border p-6 md:p-8">
            <PremiumCalculator />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container py-16 neon-bg">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl neon-text-glow">Our insurance services</h2>
          <p className="mt-3 neon-muted">Three pillars of protection for every Indian family.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Heart, title: "Life Insurance", desc: "Secure your family's future with term & endowment plans starting from ₹500/month.", color: "#39ff14" },
            { icon: Stethoscope, title: "Health Insurance", desc: "Cashless treatment at 7,000+ hospitals. Cover up to ₹1 crore for the entire family.", color: "#00d4ff" },
            { icon: Car, title: "Motor Insurance", desc: "Comprehensive 2-wheeler & 4-wheeler cover. Instant policy, zero-depreciation add-on.", color: "#39ff14" },
          ].map((s) => (
            <Card key={s.title} className="neon-glass neon-shine border-0">
              <CardContent className="p-8">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}`, color: s.color, boxShadow: `0 0 18px ${s.color}55` }}>
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{s.title}</h3>
                <p className="neon-muted">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="py-16" style={{ background: "linear-gradient(180deg, #050a05 0%, #000 100%)" }}>
        <div className="container grid gap-8 md:grid-cols-3">
          {[
            { num: "10K+", label: "Happy customers" },
            { num: "₹50Cr+", label: "Claims settled" },
            { num: "98%", label: "Claim success rate" },
          ].map((s) => (
            <div key={s.label} className="text-center neon-glass py-8">
              <div className="neon-stat text-5xl md:text-6xl">{s.num}</div>
              <div className="mt-2 neon-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="rounded-3xl p-10 text-center md:p-16"
          style={{ background: "linear-gradient(135deg, #000 0%, #052e10 100%)", border: "1px solid rgba(57,255,20,0.4)", boxShadow: "0 0 40px rgba(57,255,20,0.15)" }}>
          <h2 className="text-3xl font-bold md:text-4xl neon-text-glow">Ready to protect your family?</h2>
          <p className="mx-auto mt-3 max-w-xl neon-muted">Talk to a certified advisor today. No spam, no pressure — just honest guidance.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="neon-btn-fill">
              <a href={`tel:+${WA_NUMBER}`}><Phone className="mr-2 h-4 w-4" /> Call us now</a>
            </Button>
            <Button asChild size="lg" className="neon-btn-cyan">
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 bg-black">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="[&_span:last-child]:text-white">
            <Logo />
          </div>
          <p className="text-sm neon-muted">© {new Date().getFullYear()} Rocket Services. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
