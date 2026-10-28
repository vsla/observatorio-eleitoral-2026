import { TopBar } from "@/components/nav/TopBar";
import { PainelResultados } from "@/components/painel/PainelResultados";
import { HeroSection } from "@/components/sections/HeroSection";
import { MapSection } from "@/components/sections/MapSection";
import { TimelineSection } from "@/components/sections/TimelineSection";
import { ScenariosSection } from "@/components/sections/ScenariosSection";
import { ConsistencySection } from "@/components/sections/ConsistencySection";
import { ExploreSection } from "@/components/sections/ExploreSection";
import { MethodologySection } from "@/components/sections/MethodologySection";

export default function Home() {
  return (
    <>
      <TopBar />
      <main>
        <PainelResultados />
        <div className="border-t border-line bg-card/40">
          <HeroSection />
          <TimelineSection />
          <MapSection />
          <ScenariosSection />
          <ConsistencySection />
          <ExploreSection />
          <MethodologySection />
        </div>
      </main>
      <footer className="border-t border-line px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <p>
            <span className="font-serif font-semibold text-ink">Observatório 2026</span> · Dados do Tribunal Superior
            Eleitoral (TSE). Sem filiação partidária.
          </p>
          <p className="text-xs">Mapa base © OpenStreetMap · CARTO · Malha municipal IBGE</p>
        </div>
      </footer>
    </>
  );
}
