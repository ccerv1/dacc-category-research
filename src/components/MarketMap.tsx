"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Delaunay } from "d3-delaunay";
import registry from "../../data/registry.json";

// ===== Types =====
interface Project {
  id: string;
  name: string;
}

interface Category {
  name: string;
  projects: Project[];
}

interface Site {
  name: string;
  projects: Project[];
  value: number;
  qId: string;
  count: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rw: number;
  rh: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TreemapItem {
  name: string;
  projects: Project[];
  value: number;
  rx: number;
  ry: number;
  rw: number;
  rh: number;
}

// ===== Transform registry.json to quadrant map =====
function buildData(): Record<string, Category[]> {
  const data: Record<string, Category[]> = {};
  for (const q of registry.quadrants) {
    data[q.id] = q.categories.map((c) => ({
      name: c.name,
      projects: c.projects.map((p) => ({ id: p.id, name: p.name })),
    }));
  }
  return data;
}

// ===== Colors =====
const QUADRANT_FILLS: Record<string, string> = {
  "atoms-survive": "#f0d4e8",
  "atoms-thrive": "#d0eec8",
  "bits-survive": "#cccef0",
  "bits-thrive": "#b4dce8",
};

// ===== Squarified treemap =====
function squarify(items: TreemapItem[], rect: Rect): TreemapItem[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ ...items[0], rx: rect.x, ry: rect.y, rw: rect.w, rh: rect.h }];
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  const isWide = rect.w >= rect.h;
  let bestWorst = Infinity,
    splitAt = 1;

  for (let i = 1; i <= items.length; i++) {
    const row = items.slice(0, i);
    const rowTotal = row.reduce((s, it) => s + it.value, 0);
    const frac = rowTotal / total;
    const strip = isWide ? rect.w * frac : rect.h * frac;
    const cross = isWide ? rect.h : rect.w;
    let worst = 0;
    for (const it of row) {
      const sz = cross * (it.value / rowTotal);
      worst = Math.max(worst, Math.max(strip / sz, sz / strip));
    }
    if (worst <= bestWorst) {
      bestWorst = worst;
      splitAt = i;
    } else break;
  }

  const row = items.slice(0, splitAt);
  const rest = items.slice(splitAt);
  const rowTotal = row.reduce((s, it) => s + it.value, 0);
  const frac = rowTotal / total;
  const results: TreemapItem[] = [];

  if (isWide) {
    const sw = rect.w * frac;
    let cy = rect.y;
    for (const it of row) {
      const h = rect.h * (it.value / rowTotal);
      results.push({ ...it, rx: rect.x, ry: cy, rw: sw, rh: h });
      cy += h;
    }
    if (rest.length)
      results.push(
        ...squarify(rest, {
          x: rect.x + sw,
          y: rect.y,
          w: rect.w - sw,
          h: rect.h,
        })
      );
  } else {
    const sh = rect.h * frac;
    let cx = rect.x;
    for (const it of row) {
      const w = rect.w * (it.value / rowTotal);
      results.push({ ...it, rx: cx, ry: rect.y, rw: w, rh: sh });
      cx += w;
    }
    if (rest.length)
      results.push(
        ...squarify(rest, {
          x: rect.x,
          y: rect.y + sh,
          w: rect.w,
          h: rect.h - sh,
        })
      );
  }
  return results;
}

// ===== Largest inscribed rectangle =====
function inscribedRect(
  pts: [number, number][],
  cx: number,
  cy: number
): Rect {
  const bx = d3.min(pts, (p) => p[0])!;
  const by = d3.min(pts, (p) => p[1])!;
  const bw = d3.max(pts, (p) => p[0])! - bx;
  const bh = d3.max(pts, (p) => p[1])! - by;

  let bestArea = 0;
  let bestRect: Rect | null = null;
  for (let wFrac = 0.95; wFrac >= 0.3; wFrac -= 0.05) {
    const w = bw * wFrac;
    let lo = 0,
      hi = bh;
    for (let step = 0; step < 15; step++) {
      const mid = (lo + hi) / 2;
      const corners: [number, number][] = [
        [cx - w / 2, cy - mid / 2],
        [cx + w / 2, cy - mid / 2],
        [cx + w / 2, cy + mid / 2],
        [cx - w / 2, cy + mid / 2],
      ];
      if (corners.every((p) => d3.polygonContains(pts, p))) lo = mid;
      else hi = mid;
    }
    const h = lo;
    if (w * h > bestArea) {
      bestArea = w * h;
      bestRect = { x: cx - w / 2, y: cy - h / 2, w, h };
    }
  }
  return bestRect || { x: cx - 20, y: cy - 20, w: 40, h: 40 };
}

// ===== Main render function =====
const MIN_W = 1024;
const MIN_H = 768;

function renderMap(svgEl: SVGSVGElement) {
  const DATA = buildData();

  const W = Math.max(window.innerWidth, MIN_W);
  const H = Math.max(window.innerHeight, MIN_H);
  const M = 40;
  const innerW = W - M * 2;
  const innerH = H - M * 2;

  // Proportional axis splits
  const countByQ: Record<string, number> = {};
  for (const [qId, cats] of Object.entries(DATA)) {
    countByQ[qId] = cats.reduce((s, c) => s + c.projects.length, 0);
  }
  const atomsN = countByQ["atoms-survive"] + countByQ["atoms-thrive"];
  const bitsN = countByQ["bits-survive"] + countByQ["bits-thrive"];
  const surviveN = countByQ["atoms-survive"] + countByQ["bits-survive"];
  const thriveN = countByQ["atoms-thrive"] + countByQ["bits-thrive"];
  const xSplit = atomsN / (atomsN + bitsN);
  const ySplit = surviveN / (surviveN + thriveN);

  // Compute Voronoi sites from treemap centers
  const quadrantRects: Record<string, Rect> = {
    "atoms-survive": { x: M, y: M, w: innerW * xSplit, h: innerH * ySplit },
    "atoms-thrive": {
      x: M,
      y: M + innerH * ySplit,
      w: innerW * xSplit,
      h: innerH * (1 - ySplit),
    },
    "bits-survive": {
      x: M + innerW * xSplit,
      y: M,
      w: innerW * (1 - xSplit),
      h: innerH * ySplit,
    },
    "bits-thrive": {
      x: M + innerW * xSplit,
      y: M + innerH * ySplit,
      w: innerW * (1 - xSplit),
      h: innerH * (1 - ySplit),
    },
  };

  const allSites: Site[] = [];
  for (const [qId, cats] of Object.entries(DATA)) {
    const qRect = quadrantRects[qId];
    const items: TreemapItem[] = cats
      .map((c) => ({
        ...c,
        value: c.projects.length,
        rx: 0,
        ry: 0,
        rw: 0,
        rh: 0,
      }))
      .sort((a, b) => b.value - a.value);
    const layout = squarify(items, qRect);
    for (const cell of layout) {
      allSites.push({
        ...cell,
        qId,
        count: cell.value,
        x: cell.rx + cell.rw / 2,
        y: cell.ry + cell.rh / 2,
      });
    }
  }

  // Lloyd's smoothing
  const vorBounds: [number, number, number, number] = [M, M, W - M, H - M];
  for (let iter = 0; iter < 12; iter++) {
    const del = Delaunay.from(
      allSites,
      (d) => d.x,
      (d) => d.y
    );
    const vor = del.voronoi(vorBounds);
    for (let i = 0; i < allSites.length; i++) {
      const cell = vor.cellPolygon(i);
      if (!cell) continue;
      const [ccx, ccy] = d3.polygonCentroid(cell as [number, number][]);
      allSites[i].x += (ccx - allSites[i].x) * 0.25;
      allSites[i].y += (ccy - allSites[i].y) * 0.25;
      allSites[i].x = Math.max(M + 3, Math.min(W - M - 3, allSites[i].x));
      allSites[i].y = Math.max(M + 3, Math.min(H - M - 3, allSites[i].y));
    }
  }

  // Final Voronoi
  const delaunay = Delaunay.from(
    allSites,
    (d) => d.x,
    (d) => d.y
  );
  const voronoi = delaunay.voronoi(vorBounds);

  // SVG setup
  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();
  svg.attr("width", W).attr("height", H);

  svg.append("rect").attr("width", W).attr("height", H).attr("fill", "white");

  const cellLine = d3.line<[number, number]>().curve(d3.curveLinearClosed);
  const cellLayer = svg.append("g");
  const contentLayer = svg.append("g");
  const labelLayer = svg.append("g");

  // Render cells
  for (let i = 0; i < allSites.length; i++) {
    const cell = voronoi.cellPolygon(i);
    if (!cell) continue;
    const cat = allSites[i];
    const fill = QUADRANT_FILLS[cat.qId];

    const [cx, cy] = d3.polygonCentroid(cell as [number, number][]);
    const verts = (cell as [number, number][]).slice(0, -1);

    // Inset polygon for cell wall gaps
    const inset: [number, number][] = verts.map((p) => {
      const dx = p[0] - cx;
      const dy = p[1] - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const shrink = 4;
      const s = Math.max(0, dist - shrink) / dist;
      return [cx + dx * s, cy + dy * s];
    });

    // Cell fill
    cellLayer
      .append("path")
      .attr("d", cellLine(inset))
      .attr("fill", fill)
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    // Inscribed rectangle
    const rect = inscribedRect(inset, cx, cy);

    // foreignObject with HTML content
    const fo = contentLayer
      .append("foreignObject")
      .attr("x", rect.x)
      .attr("y", rect.y)
      .attr("width", rect.w)
      .attr("height", rect.h);

    const container = fo
      .append("xhtml:div")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("align-items", "center")
      .style("justify-content", "flex-start")
      .style("padding", "6px 2px")
      .style("box-sizing", "border-box")
      .style("overflow", "hidden")
      .style(
        "font-family",
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      );

    // Category title
    container
      .append("xhtml:div")
      .style("font-size", "10px")
      .style("font-weight", "700")
      .style("color", "#333")
      .style("text-align", "center")
      .style("line-height", "1.2")
      .style("margin-bottom", "4px")
      .style("flex-shrink", "0")
      .text(cat.name);

    // Dynamic logo sizing: estimate available height and scale down if needed
    const titleHeight = 18; // ~10px font + margin
    const availH = rect.h - titleHeight - 12; // padding
    const colsFit = Math.max(1, Math.floor((rect.w - 4) / 50));
    const rowsNeeded = Math.ceil(cat.projects.length / colsFit);
    const rowH = availH / Math.max(rowsNeeded, 1);
    // Scale logo if rows don't fit at default 32px + 10px name = 42px per row
    const logoSize = Math.min(32, Math.max(18, rowH - 12));
    const itemW = Math.min(46, Math.max(30, logoSize + 14));
    const nameSize = logoSize >= 26 ? 7 : 6;

    // Logo wrap
    const logoWrap = container
      .append("xhtml:div")
      .style("display", "flex")
      .style("flex-wrap", "wrap")
      .style("gap", logoSize >= 26 ? "4px" : "2px")
      .style("justify-content", "center")
      .style("align-content", "center");

    for (const proj of cat.projects) {
      const item = logoWrap
        .append("xhtml:div")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("align-items", "center")
        .style("width", `${itemW}px`)
        .style("flex-shrink", "0");

      const imgNode = item
        .append("xhtml:img")
        .attr("src", `/images/${proj.id}.png`)
        .attr("alt", proj.name)
        .style("width", `${logoSize}px`)
        .style("height", `${logoSize}px`)
        .style("border-radius", "50%")
        .style("background", "white")
        .style("border", "1px solid rgba(0,0,0,0.1)")
        .style("object-fit", "cover")
        .node();

      if (imgNode) {
        (imgNode as HTMLImageElement).onerror = function () {
          (this as HTMLImageElement).src =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        };
      }

      item
        .append("xhtml:div")
        .style("font-size", `${nameSize}px`)
        .style("color", "#555")
        .style("text-align", "center")
        .style("margin-top", "1px")
        .style("line-height", "1.1")
        .style("word-break", "break-word")
        .text(proj.name);
    }
  }

  // Quadrant borders (edge-based, no overlap)
  const borderLayer = svg.append("g");
  const ptKey = (p: number[]) =>
    `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
  const eKey = (a: number[], b: number[]) => {
    const ka = ptKey(a),
      kb = ptKey(b);
    return ka < kb ? ka + "|" + kb : kb + "|" + ka;
  };

  const edgeMap: Record<
    string,
    { p1: number[]; p2: number[]; quadrants: string[] }
  > = {};
  for (let i = 0; i < allSites.length; i++) {
    const poly = voronoi.cellPolygon(i);
    if (!poly) continue;
    const verts = (poly as [number, number][]).slice(0, -1);
    for (let j = 0; j < verts.length; j++) {
      const p1 = verts[j],
        p2 = verts[(j + 1) % verts.length];
      const key = eKey(p1, p2);
      if (!edgeMap[key]) edgeMap[key] = { p1, p2, quadrants: [] };
      edgeMap[key].quadrants.push(allSites[i].qId);
    }
  }
  for (const e of Object.values(edgeMap)) {
    const uq = Array.from(new Set(e.quadrants));
    if (e.quadrants.length === 1 || uq.length > 1) {
      borderLayer
        .append("line")
        .attr("x1", e.p1[0])
        .attr("y1", e.p1[1])
        .attr("x2", e.p2[0])
        .attr("y2", e.p2[1])
        .attr("stroke", "#bbb")
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round");
    }
  }

  // Axis labels
  const xBoundary = M + innerW * xSplit;
  labelLayer
    .append("text")
    .attr("x", (M + xBoundary) / 2)
    .attr("y", M - 14)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "800")
    .attr("letter-spacing", "3px")
    .attr("fill", "#666")
    .text("ATOMS");
  labelLayer
    .append("text")
    .attr("x", (xBoundary + W - M) / 2)
    .attr("y", M - 14)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "800")
    .attr("letter-spacing", "3px")
    .attr("fill", "#666")
    .text("BITS");

  const yBoundary = M + innerH * ySplit;
  labelLayer
    .append("text")
    .attr("x", M - 14)
    .attr("y", (M + yBoundary) / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "800")
    .attr("letter-spacing", "3px")
    .attr("fill", "#666")
    .attr(
      "transform",
      `rotate(-90, ${M - 14}, ${(M + yBoundary) / 2})`
    )
    .text("SURVIVE");
  labelLayer
    .append("text")
    .attr("x", M - 14)
    .attr("y", (yBoundary + H - M) / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "800")
    .attr("letter-spacing", "3px")
    .attr("fill", "#666")
    .attr(
      "transform",
      `rotate(-90, ${M - 14}, ${(yBoundary + H - M) / 2})`
    )
    .text("THRIVE");
}

export default function MarketMap() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    renderMap(svgRef.current);

    let timeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (svgRef.current) renderMap(svgRef.current);
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      style={{
        minWidth: MIN_W,
        minHeight: MIN_H,
        display: "block",
        background: "white",
      }}
    />
  );
}
