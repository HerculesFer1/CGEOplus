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
  { key: "total",     label: "Total",              short: "Total",    cor: "#FF9F0A" },
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

  /** Valor selecionado por feature (0 se município não tem dados). */
  const valores = useMemo(() => {
    if (!geo) return null;
    const arr: number[] = geo.features.map((f) => {
      const v = valoresPorMun.get(norm(f.properties.name));
      if (!v) return 0;
      if (metrica === "total") return v.total;
      return v.buckets[metrica] ?? 0;
    });
    const max = Math.max(1, ...arr);
    return { arr, max };
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
        Carregando mapa dos 223 municípios…
      </div>
    );
  }

  const cor = METRICAS.find((m) => m.key === metrica)!.cor;
  const total = valores.arr.reduce((s, v) => s + v, 0);
  const cobertura = valores.arr.filter((v) => v > 0).length;

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

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-[var(--elevated)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            {METRICAS.find((m) => m.key === metrica)!.label}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: cor }}>
            {formatNumber(total)}
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--elevated)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Municípios com dados
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {cobertura} <span className="text-sm text-[var(--text-muted)]">/ 223</span>
          </p>
        </div>
        <div className="rounded-lg border bg-[var(--elevated)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            Município c/ maior valor
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatNumber(valores.max)}
          </p>
        </div>
      </div>

      {/* Mapa SVG */}
      <div
        className="relative overflow-hidden rounded-xl border bg-[var(--surface)]"
        style={{ aspectRatio: "3 / 4" }}
      >
        <MapaSvg
          geo={geo}
          bbox={bbox}
          valores={valores}
          cor={cor}
          onHover={setHover}
        />

        {hover && (
          <div
            className="pointer-events-none absolute rounded-md border bg-[var(--elevated)] px-2.5 py-1.5 text-xs shadow-[var(--shadow-sm)]"
            style={{
              left: `${hover.x}px`,
              top: `${hover.y}px`,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
          >
            <div className="font-medium text-[var(--text)]">{hover.nome}</div>
            <div className="text-[var(--text-muted)]">
              {METRICAS.find((m) => m.key === metrica)!.short}:{" "}
              <strong style={{ color: cor }}>{formatNumber(hover.valor)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Legenda gradiente */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
        <span>0</span>
        <div
          className="h-2 flex-1 rounded"
          style={{
            background: `linear-gradient(to right, var(--surface), ${cor})`,
          }}
        />
        <span>{formatNumber(valores.max)}</span>
      </div>
    </div>
  );
}

/* ── SVG do mapa (memoizado por metrica) ────────────────────────────────── */

function MapaSvg({
  geo,
  bbox,
  valores,
  cor,
  onHover,
}: {
  geo: GeoJSON;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  valores: { arr: number[]; max: number };
  cor: string;
  onHover: (h: { nome: string; valor: number; x: number; y: number } | null) => void;
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
        const intensidade = valores.max > 0 ? p.valor / valores.max : 0;
        const opacity = p.valor === 0 ? 0.08 : 0.25 + intensidade * 0.75;
        return (
          <path
            key={i}
            d={p.d}
            fill={cor}
            fillOpacity={opacity}
            stroke="var(--border)"
            strokeWidth={0.5}
            className="cursor-pointer transition-opacity hover:stroke-[var(--text)]"
            onMouseEnter={(e) => {
              const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement)
                .getBoundingClientRect();
              const parent = e.currentTarget.ownerSVGElement!.parentElement!;
              const parentRect = parent.getBoundingClientRect();
              const bb = e.currentTarget.getBoundingClientRect();
              onHover({
                nome: p.name,
                valor: p.valor,
                x: bb.left + bb.width / 2 - parentRect.left,
                y: bb.top - parentRect.top,
              });
              void rect;
            }}
            onMouseLeave={() => onHover(null)}
          />
        );
      })}
    </svg>
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
