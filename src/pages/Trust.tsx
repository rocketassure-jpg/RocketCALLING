import { Link } from "react-router-dom";
import { Shield, Lock, Database, FileCheck, Mail } from "lucide-react";

const Trust = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold">← Home</Link>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Trust & Security
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <section>
          <h2 className="text-2xl font-bold mb-3">Our commitment</h2>
          <p className="text-muted-foreground">
            We take the security and privacy of your customer data seriously. This
            page outlines the controls we have in place. It is maintained by our
            team and is not an independent certification.
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-6">
          <div className="border rounded-lg p-5">
            <Lock className="h-6 w-6 mb-2 text-primary" />
            <h3 className="font-semibold mb-1">Authentication & access</h3>
            <p className="text-sm text-muted-foreground">
              Email/password for admins, OTP-based sign-in for employees, and
              role-based access control across every module.
            </p>
          </div>
          <div className="border rounded-lg p-5">
            <Database className="h-6 w-6 mb-2 text-primary" />
            <h3 className="font-semibold mb-1">Data isolation</h3>
            <p className="text-sm text-muted-foreground">
              Multi-tenant data is isolated by company using Row-Level Security
              at the database layer. Sensitive columns (API keys, invite codes)
              are reachable only through audited admin RPCs.
            </p>
          </div>
          <div className="border rounded-lg p-5">
            <FileCheck className="h-6 w-6 mb-2 text-primary" />
            <h3 className="font-semibold mb-1">Auditability</h3>
            <p className="text-sm text-muted-foreground">
              Lead, customer, and admin actions are recorded in audit logs that
              are visible only to company admins.
            </p>
          </div>
          <div className="border rounded-lg p-5">
            <Shield className="h-6 w-6 mb-2 text-primary" />
            <h3 className="font-semibold mb-1">Encryption</h3>
            <p className="text-sm text-muted-foreground">
              All traffic uses HTTPS in transit. Data at rest is encrypted by
              our managed backend provider.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Privacy</h2>
          <p className="text-muted-foreground">
            Customer phone numbers are masked by default in agent views. Only
            authorized roles can reveal full contact details, and reveals are
            recorded for audit. We do not sell customer data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5" /> Report a security issue
          </h2>
          <p className="text-muted-foreground">
            If you believe you have found a vulnerability, please contact your
            company administrator, who can reach out to us directly. We aim to
            acknowledge reports within 2 business days.
          </p>
        </section>

        <footer className="text-xs text-muted-foreground pt-6 border-t">
          This page is maintained by the product team and reflects current
          controls; it is not an independent audit or certification.
        </footer>
      </main>
    </div>
  );
};

export default Trust;
