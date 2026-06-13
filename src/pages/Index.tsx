import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/Logo";
import { EnquiryForm } from "@/components/EnquiryForm";
import { Link } from "react-router-dom";
import { InstallPWA } from "@/components/InstallPWA";
import { PremiumCalculator } from "@/components/PremiumCalculator";
import { Heart, Stethoscope, Car, ShieldCheck, Phone, Clock, Award, MessageCircle, Calculator, ArrowUpRight } from "lucide-react";
import heroImage from "@/assets/hero-insurance-neon.jpg.asset.json";

const WA_NUMBER = "919669762808";

const Index = () => {
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <div className="neon-root min-h-screen relative" style={{ background: "#f8fafc" }}>
      <div className="neon-particles" aria-hidden="true" />

      {/* Nav — Martian-style minimal */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="[&_span:last-child]:text-slate-900 [&_span:first-child]:!bg-transparent [&_svg]:!text-[#ff7b00]">
            <Logo />
          </div>
          <nav className="hidden items-center gap-10 md:flex">
            <a href="#enquiry" className="neon-link text-xs font-semibold uppercase tracking-[0.2em]">Enquiry</a>
            <button onClick={() => setCalcOpen(true)} className="neon-link text-xs font-semibold uppercase tracking-[0.2em]">Calculator</button>
            <a href="#services" className="neon-link text-xs font-semibold uppercase tracking-[0.2em]">Services</a>
            <a href="#why" className="neon-link text-xs font-semibold uppercase tracking-[0.2em]">Why Us</a>
          </nav>
          <div className="flex items-center gap-2">
            <InstallPWA />
            <Button asChild size="sm" className="neon-btn-fill">
              <Link to="/auth">Staff Login</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — image right, headline left, Martian condensed type */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10"
             style={{ background: "radial-gradient(900px 500px at 80% 30%, rgba(57,255,20,0.08), transparent 60%), radial-gradient(700px 400px at 10% 80%, rgba(0,212,255,0.07), transparent 60%), #06121f" }} />
        <div className="container grid items-center gap-10 py-16 md:py-24 lg:grid-cols-2 lg:py-32">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full neon-glass px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
              <ShieldCheck className="h-3.5 w-3.5 neon-accent" /> Trusted by 10,000+ families
            </span>
            <h1 className="font-black uppercase leading-[0.9] tracking-tight text-white"
                style={{ fontSize: "clamp(2.75rem, 8vw, 6.5rem)", fontStretch: "condensed", letterSpacing: "-0.02em" }}>
              <span className="block">INSURANCE</span>
              <span className="block neon-text-glow">EXPERT</span>
              <span className="block text-white/40" style={{ fontSize: "0.55em" }}>FOR EVERY FAMILY</span>
            </h1>
            <p className="max-w-md text-base text-white/60 md:text-lg">
              Life, health & motor insurance — tailored for Indian families. Get a free quote in 2 minutes from your local Rocket Services advisor.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="neon-btn-fill group">
                <a href="#enquiry">Get a free quote <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></a>
              </Button>
              <Button size="lg" className="neon-btn-outline" onClick={() => setCalcOpen(true)}>
                <Calculator className="h-4 w-4" /> Premium Calculator
              </Button>
              <Button asChild size="lg" className="neon-btn-cyan">
                <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Mujhe insurance ki jaankari chahiye")}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp Expert
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 pt-2 text-sm">
              <div className="neon-glass flex items-center gap-2 px-4 py-2 text-white">
                <Award className="h-4 w-4 neon-accent" /> IRDAI certified
              </div>
              <div className="neon-glass neon-glass-cyan flex items-center gap-2 px-4 py-2 text-white">
                <Clock className="h-4 w-4 neon-cyan" /> 24×7 claim support
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl"
                 style={{ background: "radial-gradient(circle at 50% 50%, rgba(57,255,20,0.25), transparent 60%)", filter: "blur(40px)" }} />
            <img
              src={heroImage.url}
              alt="Indian family protected by a neon insurance shield around their home and car"
              width={1920}
              height={1080}
              className="w-full rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(57,255,20,0.18)]"
            />
          </div>
        </div>
      </section>

      {/* Enquiry */}
      <section id="enquiry" className="container py-20">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] neon-accent">/ 01 — Enquiry</p>
          <h2 className="font-black uppercase leading-[0.9] tracking-tight text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Tell us what you need
          </h2>
        </div>
        <div className="mx-auto max-w-3xl neon-glass p-6 md:p-8">
          <EnquiryForm />
        </div>
      </section>

      {/* Services — Martian-style large condensed type */}
      <section id="services" className="container py-20">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] neon-accent">/ 02 — Services</p>
          <h2 className="font-black uppercase leading-[0.9] tracking-tight text-white" style={{ fontSize: "clamp(2.25rem, 6vw, 4.5rem)" }}>
            Three pillars of <span className="neon-text-glow">protection</span>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Heart, title: "Life Insurance", desc: "Secure your family's future with term & endowment plans starting from ₹500/month.", color: "#39ff14" },
            { icon: Stethoscope, title: "Health Insurance", desc: "Cashless treatment at 7,000+ hospitals. Cover up to ₹1 crore for the entire family.", color: "#00d4ff" },
            { icon: Car, title: "Motor Insurance", desc: "Comprehensive 2-wheeler & 4-wheeler cover. Instant policy, zero-depreciation add-on.", color: "#39ff14" },
          ].map((s, i) => (
            <Card key={s.title} className="neon-glass neon-shine border-0">
              <CardContent className="p-8">
                <div className="mb-5 flex items-center justify-between">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl"
                       style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}`, color: s.color, boxShadow: `0 0 18px ${s.color}55` }}>
                    <s.icon className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-mono text-white/30">0{i + 1}</span>
                </div>
                <h3 className="mb-2 text-2xl font-bold text-white">{s.title}</h3>
                <p className="neon-muted">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section id="why" className="py-20" style={{ background: "linear-gradient(180deg, #06121f 0%, #04101a 100%)" }}>
        <div className="container">
          <p className="mb-10 text-center text-[10px] font-semibold uppercase tracking-[0.3em] neon-accent">/ 03 — By the numbers</p>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { num: "10K+", label: "Happy customers" },
              { num: "₹50Cr+", label: "Claims settled" },
              { num: "98%", label: "Claim success rate" },
            ].map((s) => (
              <div key={s.label} className="text-center neon-glass py-10">
                <div className="neon-stat" style={{ fontSize: "clamp(3rem, 7vw, 5rem)" }}>{s.num}</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] neon-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="rounded-3xl p-10 text-center md:p-16"
             style={{ background: "linear-gradient(135deg, #06121f 0%, #052e10 100%)", border: "1px solid rgba(57,255,20,0.4)", boxShadow: "0 0 40px rgba(57,255,20,0.15)" }}>
          <h2 className="font-black uppercase leading-[0.9] tracking-tight text-white neon-text-glow" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Ready to protect your family?
          </h2>
          <p className="mx-auto mt-4 max-w-xl neon-muted">Talk to a certified advisor today. No spam, no pressure — just honest guidance.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
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

      <footer className="border-t border-white/5 bg-[#04101a] py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="[&_span:last-child]:text-white">
            <Logo />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] neon-muted">© {new Date().getFullYear()} Rocket Services — All rights reserved</p>
        </div>
      </footer>

      {/* Premium Calculator Modal */}
      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="neon-root max-w-4xl max-h-[90vh] overflow-y-auto border border-white/10 bg-[#06121f] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight neon-text-glow" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}>
              Premium Calculator
            </DialogTitle>
            <p className="text-sm neon-muted">Apni car / bike ka premium 30 second mein calculate karein.</p>
          </DialogHeader>
          <div className="neon-grad-border mt-4 p-4 md:p-6">
            <PremiumCalculator />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
