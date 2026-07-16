"use client";

import { useEffect, useMemo, useState } from "react";

import { formatNumber } from "@/lib/utils";

/** Chave normalizada (sem acentos, minúscula) para casar município ↔ geojson. */
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

export interface MapaChoroplethProps {
  /** Dados por município — chave é o nome (será normalizado internamente). */
  dados: Array<{ municipio: string; valor: number }>;
  /** Cor tema (deve ser um hex; usada com opacidade variável nos bins). */
  cor: string;
  /** Rótulo curto da métrica pro tooltip e overlay. */
  labelMetrica: string;
  /** Formatador do valor no overlay/tooltip. Default: formatNumber inteiro. */
  formatValor?: (v: number) => string;
  /** Sufixo pro valor (ex: "ha", "%"). Aparece após o número. */
  sufixo?: string;
  /** Ativa altura menor pro modo dentro de slides (default 480px). */
  altura?: number;
}

/**
 * Coroplético municipal do Piauí baseado em SVG puro (mesma técnica do módulo
 * /car). Genérico o suficiente para servir aos 3 dashboards Monit Ext.
 *
 * Escala quantílica em 5 bins + faixa "sem dados". Overlays mostram
 * total, maior e menor município. Tooltip on hover.
 */
export function MapaChoropleth({
  dados,
  cor,
  labelMetrica,
  formatValor = (v) => formatNumber(Math.round(v)),
  sufixo,
  altura = 480,
}: MapaChoroplethProps) {
  const [geo, setGeo] = useState<GeoJSON | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    nome: string;
    valor: number;
    x: number;
    y: number;
  } | null>(null);

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

  const valoresPorMun = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dados) map.set(norm(d.municipio), d.valor);
    return map;
  }, [dados]);

  const valores = useMemo(() => {
    if (!geo) return null;
    const arr = geo.features.map((f) => valoresPorMun.get(norm(f.properties.name)) ?? 0);
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
  }, [geo, valoresPorMun]);

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
      <div
        className="flex items-center justify-center rounded-xl border bg-[var(--surface)] text-sm text-[var(--text-muted)]"
        style={{ height: altura }}
      >
        Carregando mapa dos 224 municípios…
      </div>
    );
  }

  const cobertura = valores.arr.filter((v) => v > 0).length;
  const totalMunicipios = geo.features.length;
  const totalGeral = valores.arr.reduce((s, v) => s + v, 0);

  const fmt = (v: number) => `${formatValor(v)}${sufixo ? ` ${sufixo}` : ""}`;

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-xl border bg-[var(--surface)]"
        style={{ height: altura, minHeight: 360 }}
      >
        <MapaSvg
          geo={geo}
          bbox={bbox}
          valores={valores}
          cor={cor}
          onHover={setHover}
        />

        {/* Overlays 2×2 no canto superior esquerdo */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 grid grid-cols-2 gap-2">
          <OverlayCard>
            <OverlayLabel>{labelMetrica}</OverlayLabel>
            <OverlayValue color={cor}>{fmt(totalGeral)}</OverlayValue>
          </OverlayCard>
          <OverlayCard>
            <OverlayLabel>Maior</OverlayLabel>
            <OverlayValue color={cor}>{fmt(valores.maiorValor)}</OverlayValue>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {valores.maiorNome}
            </p>
          </OverlayCard>
          <OverlayCard>
            <OverlayLabel>Municípios com dado</OverlayLabel>
            <OverlayValue>
              {cobertura}
              <span className="ml-0.5 text-sm text-[var(--text-muted)]">
                / {totalMunicipios}
              </span>
            </OverlayValue>
          </OverlayCard>
          <OverlayCard>
            <OverlayLabel>Menor</OverlayLabel>
            <OverlayValue color={cor}>{fmt(valores.menorValor)}</OverlayValue>
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
              {labelMetrica}:{" "}
              <strong style={{ color: cor }}>{fmt(hover.valor)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Legenda quantílica */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-6 rounded"
            style={{ backgroundColor: "var(--surface)", opacity: 0.35 }}
          />
          Sem dado
        </span>
        {BIN_OPACITY.map((op, i) => {
          const inferior = i === 0 ? 1 : valores.bins[i - 1] + 1;
          const superior = i < valores.bins.length ? valores.bins[i] : valores.max;
          return (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-6 rounded"
                style={{ backgroundColor: cor, opacity: op }}
              />
              {fmt(inferior)}–{fmt(superior)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── SVG puro ───────────────────────────────────────────────────────────── */

const BIN_OPACITY = [0.35, 0.55, 0.72, 0.87, 1.0];

function classificar(v: number, bins: number[]): number {
  if (v <= 0) return -1;
  for (let i = 0; i < bins.length; i++) {
    if (v <= bins[i]) return i;
  }
  return bins.length;
}

function MapaSvg({
  geo,
  bbox,
  valores,
  cor,
  onHover,
}: {
  geo: GeoJSON;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  valores: { arr: number[]; max: number; bins: number[] };
  cor: string;
  onHover: (h: { nome: string; valor: number; x: number; y: number } | null) => void;
}) {
  const width = 1000;
  const height = 1200;
  const scaleX = width / (bbox.maxX - bbox.minX);
  const scaleY = height / (bbox.maxY - bbox.minY);
  const scale = Math.min(scaleX, scaleY) * 0.98;
  const offsetX = (width - (bbox.maxX - bbox.minX) * scale) / 2;
  const offsetY = (height - (bbox.maxY - bbox.minY) * scale) / 2;

  const proj = (lon: number, lat: number): [number, number] => [
    (lon - bbox.minX) * scale + offsetX,
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
        return (
          <path
            key={i}
            d={p.d}
            fill={fill}
            fillOpacity={opacity}
            stroke="var(--border)"
            strokeWidth={0.5}
            className="cursor-default transition-opacity hover:stroke-[var(--text)]"
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
          />
        );
      })}
    </svg>
  );
}

/* ── Overlays ───────────────────────────────────────────────────────────── */

function OverlayCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto w-36 rounded-lg border border-[var(--border)] bg-[var(--elevated)]/85 p-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md">
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

/* ── Geometria ──────────────────────────────────────────────────────────── */

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
