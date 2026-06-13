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
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#enquiry" className="text-sm font-medium text-muted-foreground hover:text-foreground">Enquiry</a>
            <a href="#calculator" className="text-sm font-medium text-muted-foreground hover:text-foreground">Premium Calculator</a>
            <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-foreground">Services</a>
            <a href="#why" className="text-sm font-medium text-muted-foreground hover:text-foreground">Why Us</a>
          </nav>
          <div className="flex items-center gap-2">
            <InstallPWA />
            <Button asChild variant="hero" size="sm">
              <Link to="/auth">Staff Login</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background video */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <iframe
            className="absolute left-1/2 top-1/2 h-[300%] w-[300%] -translate-x-1/2 -translate-y-1/2"
            src="https://www.youtube.com/embed/Igjxvu7NOKw?autoplay=1&mute=1&loop=1&playlist=Igjxvu7NOKw&controls=0&rel=0&modestbranding=1&iv_load_policy=3"
            title="Rocket Services Insurance"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 z-10 bg-black/60" />

        {/* Content */}
        <div className="relative z-20 container py-20">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Trusted by 10,000+ families
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
              insurance expert
            </h1>
            <p className="mx-auto max-w-xl text-lg text-white/80">
              Life, health & motor insurance — tailored for Indian families. Get a free quote in 2 minutes from your local Rocket Services advisor.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="hero" size="lg"><a href="#enquiry">Get a free quote</a></Button>
              <Button asChild variant="outline" size="lg"><a href="#calculator"><Calculator className="h-4 w-4" /> Premium Calculator</a></Button>
              <Button asChild variant="success" size="lg">
                <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Mujhe insurance ki jaankari chahiye")}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp Expert
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-white/70">
              <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> IRDAI certified</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 24×7 claim support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="enquiry" className="container py-16">
        <div className="mx-auto max-w-3xl">
          <EnquiryForm />
        </div>
      </section>

      {/* Premium Calculator */}
      <section id="calculator" className="bg-secondary/30 py-16">
        <div className="container">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Motor Insurance Premium Calculator</h2>
            <p className="mt-3 text-muted-foreground">Apni car / bike ka premium 30 second mein calculate karein. PDF download ya WhatsApp pe direct share karein.</p>
          </div>
          <PremiumCalculator />
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Our insurance services</h2>
          <p className="mt-3 text-muted-foreground">Three pillars of protection for every Indian family.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Heart, title: "Life Insurance", desc: "Secure your family's future with term & endowment plans starting from ₹500/month." },
            { icon: Stethoscope, title: "Health Insurance", desc: "Cashless treatment at 7,000+ hospitals. Cover up to ₹1 crore for the entire family." },
            { icon: Car, title: "Motor Insurance", desc: "Comprehensive 2-wheeler & 4-wheeler cover. Instant policy, zero-depreciation add-on." },
          ].map((s) => (
            <Card key={s.title} className="group border-2 transition-all hover:border-primary hover:shadow-elegant">
              <CardContent className="p-8">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-primary">
                  <s.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="bg-secondary/40 py-16">
        <div className="container grid gap-8 md:grid-cols-3">
          {[
            { num: "10K+", label: "Happy customers" },
            { num: "₹50Cr+", label: "Claims settled" },
            { num: "98%", label: "Claim success rate" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="bg-gradient-primary bg-clip-text bg-primary text-5xl font-bold text-accent md:text-6xl">{s.num}</div>
              <div className="mt-2 text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="rounded-3xl bg-gradient-hero p-10 text-center shadow-elegant md:p-16">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to protect your family?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">Talk to a certified advisor today. No spam, no pressure — just honest guidance.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <a href={`tel:+${WA_NUMBER}`}><Phone className="mr-2 h-4 w-4" /> Call us now</a>
            </Button>
            <Button asChild size="lg" className="bg-white/10 text-white border border-white hover:bg-white hover:text-primary">
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Rocket Services. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
