import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { Heart, Stethoscope, Car, ShieldCheck, Phone, Clock, Award } from "lucide-react";
import heroImg from "@/assets/hero-insurance.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-foreground">Services</a>
            <a href="#why" className="text-sm font-medium text-muted-foreground hover:text-foreground">Why Us</a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">Contact</a>
          </nav>
          <Button asChild variant="hero" size="sm">
            <Link to="/auth">Staff Login</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="container grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Trusted by 10,000+ families
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              Insurance solutions that <span className="bg-gradient-primary bg-clip-text text-transparent">protect what matters</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Life, health & motor insurance — tailored for Indian families. Fast claims, honest advice, lifetime support from your local Rocket Insurance advisor.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg"><a href="#contact">Get a free quote</a></Button>
              <Button asChild variant="outline" size="lg"><a href="#services">View plans</a></Button>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> IRDAI certified</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 24×7 claim support</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-hero opacity-20 blur-3xl" />
            <img src={heroImg} alt="Rocket Insurance protects families" width={1536} height={1024} className="relative rounded-2xl shadow-elegant" />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Our insurance services</h2>
          <p className="mt-3 text-muted-foreground">Three pillars of protection for every Indian family.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Heart, title: "Life Insurance", desc: "Secure your family's future with term & endowment plans starting from ₹500/month.", color: "text-destructive" },
            { icon: Stethoscope, title: "Health Insurance", desc: "Cashless treatment at 7,000+ hospitals. Cover up to ₹1 crore for the entire family.", color: "text-success" },
            { icon: Car, title: "Motor Insurance", desc: "Comprehensive 2-wheeler & 4-wheeler cover. Instant policy, zero-depreciation add-on.", color: "text-accent" },
          ].map((s) => (
            <Card key={s.title} className="group border-2 transition-all hover:border-primary hover:shadow-elegant">
              <CardContent className="p-8">
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-secondary ${s.color}`}>
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
      <section id="why" className="bg-secondary/40 py-20">
        <div className="container grid gap-8 md:grid-cols-3">
          {[
            { num: "10K+", label: "Happy customers" },
            { num: "₹50Cr+", label: "Claims settled" },
            { num: "98%", label: "Claim success rate" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="bg-gradient-primary bg-clip-text text-5xl font-bold text-transparent md:text-6xl">{s.num}</div>
              <div className="mt-2 text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="container py-20">
        <div className="rounded-3xl bg-gradient-hero p-10 text-center shadow-elegant md:p-16">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to protect your family?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">Talk to a certified advisor today. No spam, no pressure — just honest guidance.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <a href="tel:+919999999999"><Phone className="mr-2 h-4 w-4" /> Call us now</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white hover:text-primary">
              <Link to="/auth">Staff Login</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Rocket Insurance. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
