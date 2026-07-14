"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { fadeSlideUp } from "@/lib/design/motion";
import { formatNumber } from "@/lib/utils";
import type { CarImportacaoResumo } from "@/lib/car/importer";
import type { CarBucket } from "@/lib/car/types";

/** Chave normalizada (sem acentos, minúscula) para match município ↔ geojson. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

interface GeoFeature {
  type: "Feature";
  properties: { id: string; name: string };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoFeature[];
}

type Metrica = "total" | "AG_GESTOR" | "PENDENTE" | "VALIDADO" | "CANCELADO";

const METRICAS: Array<{ key: Metrica; label: string; short: string; cor: string }> = [
  // Total = azul CGEO+ (accent) para não conflitar com o laranja SICAR de Ag. Empreendedor.
  { key: "total",     label: "Total",              short: "Total",    cor: "#0071E3" },
  { key: "AG_GESTOR", label: "Aguardando Gestor",  short: "Ag.Gestor", cor: "#FF453A" },
  { key: "PENDENTE",  label: "Ag. Empreendedor",   short: "Ag.Empreend.", cor: "#FF9F0A" },
  { key: "VALIDADO",  label: "Validados",          short: "Validados", cor: "#30D158" },
  { key: "CANCELADO", label: "Cancelados",         short: "Cancelados", cor: "#8E8E93" },
];

interface Props {
  resumo: CarImportacaoResumo;
}

export function MapaMunicipal({ resumo }: Props) {
  const [geo, setGeo] = useState<GeoJSON | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [metrica, setMetrica] = useState<Metrica>("total");
  const [hover, setHover] = useState<{
    nome: string;
    valor: number;
    x: number;
    y: number;
  } | null>(null);
  // Município selecionado por clique (só ativo na aba "total").
  const [selecionado, setSelecionado] = useState<string | null>(null);

  // Reset seleção ao trocar de métrica — clique só faz sentido na aba Total.
  useEffect(() => {
    if (metrica !== "total") setSelecionado(null);
  }, [metrica]);

  useEffect(() => {
    let cancel = false;
    fetch("/geodata/pi-municipios.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: GeoJSON) => {
        if (!cancel) setGeo(j);
      })
      .catch((e) => {
        if (!cancel) setErro(e.message ?? String(e));
      });
    return () => {
      cancel = true;
    };
  }, []);

  /** Índice município normalizado → valores por bucket. */
  const valoresPorMun = useMemo(() => {
    const map = new Map<string, { total: number; buckets: Partial<Record<CarBucket, number>> }>();
    for (const m of resumo.porMunicipio) {
      map.set(norm(m.municipio), { total: m.total, buckets: m.porBucket });
    }
    return map;
  }, [resumo.porMunicipio]);

  /** Valor selecionado por feature + escala em 5 quantis (bins discretos).
   *  Retorna também maior/menor município (nomes) para os overlays. */
  const valores = useMemo(() => {
    if (!geo) return null;
    const arr: number[] = geo.features.map((f) => {
      const v = valoresPorMun.get(norm(f.properties.name));
      if (!v) return 0;
      if (metrica === "total") return v.total;
      return v.buckets[metrica] ?? 0;
    });
    const max = Math.max(1, ...arr);

    let maiorNome = "—",
      maiorValor = 0,
      menorNome = "—",
      menorValor = Infinity;
    geo.features.forEach((f, i) => {
      const v = arr[i];
      if (v <= 0) return;
      if (v > maiorValor) {
        maiorValor = v;
        maiorNome = f.properties.name;
      }
      if (v < menorValor) {
        menorValor = v;
        menorNome = f.properties.name;
      }
    });
    if (menorValor === Infinity) menorValor = 0;

    const positivos = arr.filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p: number) =>
      positivos.length === 0
        ? 0
        : positivos[Math.min(positivos.length - 1, Math.floor(p * positivos.length))];
    const bins = [q(0.2), q(0.4), q(0.6), q(0.8)];
    return { arr, max, bins, maiorNome, maiorValor, menorNome, menorValor };
  }, [geo, valoresPorMun, metrica]);

  const bbox = useMemo(() => geo && calcularBBox(geo), [geo]);

  if (erro) {
    return (
      <p className="p-6 text-center text-sm text-[var(--danger)]">
        Não foi possível carregar o mapa: {erro}
      </p>
    );
  }
  if (!geo || !valores || !bbox) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-[var(--text-muted)]">
        Carregando mapa dos 224 municípios…
      </div>
    );
  }

  const metricaAtual = METRICAS.find((m) => m.key === metrica)!;
  const cor = metricaAtual.cor;
  const total = valores.arr.reduce((s, v) => s + v, 0);
  const cobertura = valores.arr.filter((v) => v > 0).length;
  const totalMunicipios = geo.features.length;

  // Seleção só é válida quando a métrica ativa for "total".
  const selAtivo = metrica === "total" ? selecionado : null;
  const selValor = selAtivo
    ? valoresPorMun.get(norm(selAtivo))?.total ?? 0
    : null;

  return (
    <div className="space-y-4">
      {/* Toggle de camadas */}
      <motion.div
        variants={fadeSlideUp}
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Métrica do mapa"
      >
        {METRICAS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={metrica === m.key}
            onClick={() => setMetrica(m.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              metrica === m.key
                ? "border-[var(--text)] bg-[var(--surface)] text-[var(--text)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
            style={metrica === m.key ? { borderColor: m.cor } : undefined}
          >
            <span
              className="mr-1.5 inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: m.cor }}
            />
            {m.label}
          </button>
        ))}
      </motion.div>

      {/* Mapa SVG — altura fixa que casa com o Top 20 da tabela.
       *  PI é portrait (viewBox 1000×1200), então em um container landscape
       *  a projeção fica centralizada horizontalmente com folga nas laterais.
       *  Os overlays ocupam essas folgas sem se sobrepor ao mapa. */}
      <div
        className="relative overflow-hidden rounded-xl border bg-[var(--surface)]"
        style={{ height: "min(72vh, 640px)", minHeight: 460 }}
      >
        <MapaSvg
          geo={geo}
          bbox={bbox}
          valores={valores}
          cor={cor}
          selecionado={selAtivo}
          clicavel={metrica === "total"}
          onHover={setHover}
          onSelect={(nome) => {
            if (metrica !== "total") return;
            setSelecionado((prev) => (prev === nome ? null : nome));
          }}
        />

        {/* Overlays flutuantes — bloco 2×2 no canto superior esquerdo. */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 grid grid-cols-2 gap-2">
          <OverlayCard>
            <OverlayLabel>{selAtivo ? "Município selecionado" : metricaAtual.label}</OverlayLabel>
            <OverlayValue color={cor}>
              {formatNumber(selAtivo ? selValor ?? 0 : total)}
            </OverlayValue>
            {selAtivo ? (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="truncate text-[11px] font-medium text-[var(--text)]">
                  {selAtivo}
                </span>
                <button
                  type="button"
                  onClick={() => setSelecionado(null)}
                  className="ml-auto rounded-md border border-transparent px-1 text-[10px] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text)]"
                  aria-label="Limpar seleção"
                >
                  limpar
                </button>
              </div>
            ) : metrica === "total" ? (
              <p className="mt-0.5 text-[10px] text-[var(--text-subtle)]">
                Clique num município
              </p>
            ) : null}
          </OverlayCard>

          <OverlayCard>
            <OverlayLabel>Maior N° de Análise</OverlayLabel>
            <OverlayValue color={cor}>{formatNumber(valores.maiorValor)}</OverlayValue>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {valores.maiorNome}
            </p>
          </OverlayCard>

          <OverlayCard>
            <OverlayLabel>Municípios com dados</OverlayLabel>
            <OverlayValue>
              {cobertura}
              <span className="ml-0.5 text-sm text-[var(--text-muted)]">
                / {totalMunicipios}
              </span>
            </OverlayValue>
          </OverlayCard>

          <OverlayCard>
            <OverlayLabel>Menor N° de Análise</OverlayLabel>
            <OverlayValue color={cor}>{formatNumber(valores.menorValor)}</OverlayValue>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {valores.menorNome}
            </p>
          </OverlayCard>
        </div>

        {hover && (
          <div
            className="pointer-events-none absolute z-20 rounded-md border bg-[var(--elevated)] px-2.5 py-1.5 text-xs shadow-[var(--shadow-sm)]"
            style={{
              left: `${hover.x}px`,
              top: `${hover.y}px`,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
          >
            <div className="font-medium text-[var(--text)]">{hover.nome}</div>
            <div className="text-[var(--text-muted)]">
              {metricaAtual.short}:{" "}
              <strong style={{ color: cor }}>{formatNumber(hover.valor)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Legenda quantílica — 5 bins discretos + faixa "sem dados". */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded"
            style={{ backgroundColor: "var(--surface)", opacity: 0.35 }}
          />
          Sem dados
        </span>
        {BIN_OPACITY.map((op, i) => {
          const inferior =
            i === 0 ? 1 : valores.bins[i - 1] + 1;
          const superior =
            i < valores.bins.length ? valores.bins[i] : valores.max;
          return (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-6 rounded"
                style={{ backgroundColor: cor, opacity: op }}
              />
              {formatNumber(inferior)}–{formatNumber(superior)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── SVG do mapa (memoizado por metrica) ────────────────────────────────── */

/** Retorna qual bin quantílico um valor cai (0..4). Valor 0 fica em -1 (sem dados). */
function classificar(v: number, bins: number[]): number {
  if (v <= 0) return -1;
  for (let i = 0; i < bins.length; i++) {
    if (v <= bins[i]) return i;
  }
  return bins.length; // bin superior
}

/** Opacidades discretas por bin — cor plena, sem translucidez enfraquecida.
 *  Range mais estreito garante contraste alto entre municípios. */
const BIN_OPACITY = [0.35, 0.55, 0.72, 0.87, 1.0];

function MapaSvg({
  geo,
  bbox,
  valores,
  cor,
  selecionado,
  clicavel,
  onHover,
  onSelect,
}: {
  geo: GeoJSON;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  valores: { arr: number[]; max: number; bins: number[] };
  cor: string;
  selecionado: string | null;
  clicavel: boolean;
  onHover: (h: { nome: string; valor: number; x: number; y: number } | null) => void;
  onSelect: (nome: string) => void;
}) {
  // Projeção equirectangular normalizada em viewBox 1000x1200.
  const width = 1000;
  const height = 1200;
  const scaleX = width / (bbox.maxX - bbox.minX);
  const scaleY = height / (bbox.maxY - bbox.minY);
  const scale = Math.min(scaleX, scaleY) * 0.98;
  const offsetX = (width - (bbox.maxX - bbox.minX) * scale) / 2;
  const offsetY = (height - (bbox.maxY - bbox.minY) * scale) / 2;

  const proj = (lon: number, lat: number): [number, number] => [
    (lon - bbox.minX) * scale + offsetX,
    // Y invertido: latitude cresce pra cima, SVG cresce pra baixo
    height - ((lat - bbox.minY) * scale + offsetY),
  ];

  const paths = useMemo(() => {
    return geo.features.map((f, i) => {
      const d = featureToPath(f, proj);
      return { d, name: f.properties.name, valor: valores.arr[i] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, valores]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
    >
      {paths.map((p, i) => {
        const bin = classificar(p.valor, valores.bins);
        const fill = bin < 0 ? "var(--surface)" : cor;
        const opacity = bin < 0 ? 0.35 : BIN_OPACITY[bin];
        const isSelecionado = selecionado === p.name;
        return (
          <path
            key={i}
            d={p.d}
            fill={fill}
            fillOpacity={opacity}
            stroke={isSelecionado ? "var(--text)" : "var(--border)"}
            strokeWidth={isSelecionado ? 1.5 : 0.5}
            className={`${clicavel ? "cursor-pointer" : "cursor-default"} transition-opacity hover:stroke-[var(--text)]`}
            onMouseEnter={(e) => {
              const parent = e.currentTarget.ownerSVGElement!.parentElement!;
              const parentRect = parent.getBoundingClientRect();
              const bb = e.currentTarget.getBoundingClientRect();
              onHover({
                nome: p.name,
                valor: p.valor,
                x: bb.left + bb.width / 2 - parentRect.left,
                y: bb.top - parentRect.top,
              });
            }}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(p.name)}
          />
        );
      })}
    </svg>
  );
}

/* ── Overlay helpers ────────────────────────────────────────────────────── */

function OverlayCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto w-40 rounded-lg border border-[var(--border)] bg-[var(--elevated)]/85 p-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md">
      {children}
    </div>
  );
}

function OverlayLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="truncate text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function OverlayValue({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <p
      className="mt-0.5 text-lg font-semibold leading-tight tabular-nums"
      style={color ? { color } : undefined}
    >
      {children}
    </p>
  );
}

/* ── Helpers geométricos ────────────────────────────────────────────────── */

function calcularBBox(geo: GeoJSON) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const f of geo.features) {
    const coords =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;
    for (const poly of coords) {
      for (const ring of poly) {
        for (const [x, y] of ring) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function featureToPath(
  f: GeoFeature,
  proj: (lon: number, lat: number) => [number, number],
): string {
  const polys =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates]
      : f.geometry.coordinates;
  const parts: string[] = [];
  for (const poly of polys) {
    for (const ring of poly) {
      if (ring.length === 0) continue;
      const first = proj(ring[0][0], ring[0][1]);
      let d = `M${first[0].toFixed(1)},${first[1].toFixed(1)}`;
      for (let i = 1; i < ring.length; i++) {
        const [x, y] = proj(ring[i][0], ring[i][1]);
        d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
      }
      d += " Z";
      parts.push(d);
    }
  }
  return parts.join(" ");
}
