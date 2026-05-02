"use client";

import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingProblemSolution } from "./landing-problem-solution";
import { LandingSwitchSection } from "./landing-switch-section";
import { LandingConnected } from "./landing-connected";
import { LandingClientPortal } from "./landing-client-portal";
import { LandingSecurity } from "./landing-security";
import { LandingIntegrations } from "./landing-integrations";
import { LandingContact } from "./landing-contact";
import { LandingFooter } from "./landing-footer";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingProblemSolution />
        <LandingSwitchSection />
        <LandingConnected />
        <LandingClientPortal />
        <LandingSecurity />
        <LandingIntegrations />
        <LandingContact />
      </main>
      <LandingFooter />
    </div>
  );
}
