import { useState, useRef, useCallback, useMemo, useEffect } from "react";

// ============================================================
// DATA MODEL
// ============================================================

const SAMPLE_DATA = {
  id: "project-1",
  name: "Перегон Иваново — Текстильщики",
  startKm: 45000, // 45 км в метрах
  endKm: 48000,   // 48 км

  tracks: [
    {
      id: "t1",
      name: "I путь",
      number: 1,
      type: "main",
      segments: [{ startX: 45000, endX: 48000, offsetY: -2.5 }],
    },
    {
      id: "t2",
      name: "II путь",
      number: 2,
      type: "main",
      segments: [{ startX: 45000, endX: 48000, offsetY: 2.5 }],
    },
    {
      id: "t3",
      name: "3 путь",
      number: 3,
      type: "station",
      segments: [{ startX: 46200, endX: 47500, offsetY: 7.5 }],
    },
  ],

  poles: (() => {
    const poles = [];
    let poleIdx = 1;

    // I путь — опоры через ~60м
    for (let x = 45030; x <= 47970; x += 60) {
      const isAnchor =
        x === 45030 || x === 46470 || x === 46530 || x === 47970;
      const isJunctionPole =
        x === 46350 || x === 46410 || x === 46470 ||
        x === 46530 || x === 46590 || x === 46650;
      const isMidAnchor = x === 45750 || x === 47250;

      poles.push({
        id: `p1-${poleIdx}`,
        number: `${Math.floor(x / 1000)}/${poleIdx}`,
        x,
        trackId: "t1",
        gabY: -3.2,
        position: "left",
        type: isAnchor ? "anchor" : isMidAnchor ? "fixing" : "intermediate",
        material: isAnchor ? "metal" : "reinforced_concrete",
        height: isAnchor ? 15 : 12,
        attachments: [
          { wireId: "w-cs1", type: "catenary", side: "right" },
          { wireId: "w-dpr1a", type: "dpr", side: "left" },
        ],
        consoles: [{ direction: "right", trackId: "t1", type: "straight", length: 3.2 }],
      });
      poleIdx++;
    }

    // II путь — опоры через ~60м
    poleIdx = 1;
    for (let x = 45030; x <= 47970; x += 60) {
      const isAnchor = x === 45030 || x === 47970;
      poles.push({
        id: `p2-${poleIdx}`,
        number: `${Math.floor(x / 1000)}/${poleIdx}`,
        x,
        trackId: "t2",
        gabY: 3.2,
        position: "right",
        type: isAnchor ? "anchor" : "intermediate",
        material: isAnchor ? "metal" : "reinforced_concrete",
        height: isAnchor ? 15 : 12,
        attachments: [
          { wireId: "w-cs2", type: "catenary", side: "left" },
          { wireId: "w-dpr2a", type: "dpr", side: "right" },
        ],
        consoles: [{ direction: "left", trackId: "t2", type: "straight", length: 3.2 }],
      });
      poleIdx++;
    }

    // 3 путь — отдельные опоры
    poleIdx = 1;
    for (let x = 46200; x <= 47500; x += 65) {
      poles.push({
        id: `p3-${poleIdx}`,
        number: `3/${poleIdx}`,
        x,
        trackId: "t3",
        gabY: 8.5,
        position: "right",
        type: x === 46200 || x >= 47470 ? "anchor" : "intermediate",
        material: "reinforced_concrete",
        height: 10,
        attachments: [{ wireId: "w-cs3", type: "catenary", side: "left" }],
        consoles: [{ direction: "left", trackId: "t3", type: "straight", length: 3.2 }],
      });
      poleIdx++;
    }

    return poles;
  })(),

  anchorSections: [
    {
      id: "as1",
      name: "АУ-1 (I путь, до сопр.)",
      trackId: "t1",
      wireType: "catenary",
      startX: 45030,
      endX: 46470,
      junctions: [
        {
          id: "j1",
          type: "insulating",
          centerX: 46500,
          spanStartX: 46350,
          spanEndX: 46650,
        },
      ],
      midAnchors: [{ id: "ma1", x: 45750, side: "left" }],
    },
    {
      id: "as2",
      name: "АУ-2 (I путь, после сопр.)",
      trackId: "t1",
      wireType: "catenary",
      startX: 46530,
      endX: 47970,
      junctions: [],
      midAnchors: [{ id: "ma2", x: 47250, side: "right" }],
    },
  ],

  wires: [
    { id: "w-cs1", type: "contact", trackId: "t1", startX: 45030, endX: 47970 },
    { id: "w-cs2", type: "contact", trackId: "t2", startX: 45030, endX: 47970 },
    { id: "w-cs3", type: "contact", trackId: "t3", startX: 46200, endX: 47500 },
    { id: "w-dpr1a", type: "dpr_a", trackId: "t1", startX: 45000, endX: 48000 },
    { id: "w-dpr2a", type: "dpr_a", trackId: "t2", startX: 45000, endX: 48000 },
  ],
};

// ============================================================
// HELPERS
// ============================================================

function formatKmPkM(meters) {
  const km = Math.floor(meters / 1000);
  const rest = meters - km * 1000;
  const pk = Math.floor(rest / 100);
  const m = Math.round(rest - pk * 100);
  return `${km} км ${pk} пк ${m > 0 ? "+" + m + " м" : ""}`.trim();
}

function getTrackY(tracks, trackId, x) {
  const track = tracks.find((t) => t.id === trackId);
  if (!track) return 0;
  for (const seg of track.segments) {
    if (x >= seg.startX && x <= seg.endX) return seg.offsetY;
  }
  return track.segments[0]?.offsetY ?? 0;
}

// ============================================================
// COLORS
// ============================================================
const COLORS = {
  bg: "#0a0e17",
  gridLine: "#1a2035",
  gridText: "#3a4a6b",
  kmLine: "#2a3a5b",
  track: "#8899bb",
  trackFill: "#141c2e",
  catenary: "#e05555",
  catenaryGlow: "#ff6b6b44",
  dpr: "#44bb77",
  dprGlow: "#44bb7744",
  pole: {
    intermediate: "#99aacc",
    anchor: "#ffcc44",
    fixing: "#66aaff",
  },
  poleHover: "#ffffff",
  console: "#667799",
  junction: {
    insulating: "#ff884422",
    non_insulating: "#66aaff22",
  },
  junctionBorder: {
    insulating: "#ff8844",
    non_insulating: "#66aaff",
  },
  midAnchor: "#ffaa33",
  selected: "#00eeff",
  label: "#556688",
  panelBg: "#111827",
  panelBorder: "#1e293b",
  panelText: "#c8d6e5",
  panelAccent: "#38bdf8",
};

// ============================================================
// SVG COMPONENTS
// ============================================================

function GridLayer({ startX, endX, scaleX, scaleY, viewHeight }) {
  const lines = [];
  const pkStart = Math.ceil(startX / 100) * 100;

  for (let x = pkStart; x <= endX; x += 100) {
    const sx = (x - startX) * scaleX;
    const isKm = x % 1000 === 0;
    lines.push(
      <g key={`grid-${x}`}>
        <line
          x1={sx} y1={0} x2={sx} y2={viewHeight}
          stroke={isKm ? COLORS.kmLine : COLORS.gridLine}
          strokeWidth={isKm ? 1.5 : 0.5}
          strokeDasharray={isKm ? "none" : "4 4"}
        />
        <text
          x={sx} y={12}
          fill={isKm ? "#5a7aab" : COLORS.gridText}
          fontSize={isKm ? 11 : 8}
          fontWeight={isKm ? 700 : 400}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
        >
          {isKm ? `${x / 1000} км` : `пк ${Math.floor((x % 1000) / 100)}`}
        </text>
      </g>
    );
  }
  return <g className="grid-layer">{lines}</g>;
}

function TrackLayer({ tracks, startX, scaleX, scaleY, centerY }) {
  return (
    <g className="track-layer">
      {tracks.map((track) =>
        track.segments.map((seg, i) => {
          const sx1 = (seg.startX - startX) * scaleX;
          const sx2 = (seg.endX - startX) * scaleX;
          const sy = centerY + seg.offsetY * scaleY;
          const gauge = 1.2 * scaleY; // ширина колеи визуально

          return (
            <g key={`${track.id}-seg-${i}`}>
              {/* Балластная призма */}
              <rect
                x={sx1} y={sy - gauge * 1.5}
                width={sx2 - sx1} height={gauge * 3}
                fill={COLORS.trackFill}
                rx={1}
              />
              {/* Рельс верхний */}
              <line
                x1={sx1} y1={sy - gauge / 2}
                x2={sx2} y2={sy - gauge / 2}
                stroke={COLORS.track}
                strokeWidth={2}
              />
              {/* Рельс нижний */}
              <line
                x1={sx1} y1={sy + gauge / 2}
                x2={sx2} y2={sy + gauge / 2}
                stroke={COLORS.track}
                strokeWidth={2}
              />
              {/* Название пути */}
              <text
                x={sx1 + 8} y={sy + gauge / 2 + 14}
                fill={COLORS.label}
                fontSize={10}
                fontFamily="'JetBrains Mono', monospace"
              >
                {track.name}
              </text>
            </g>
          );
        })
      )}
    </g>
  );
}

function WireLayer({ wires, tracks, startX, scaleX, scaleY, centerY }) {
  return (
    <g className="wire-layer">
      {wires.map((wire) => {
        const trackY = getTrackY(tracks, wire.trackId, wire.startX);
        const sy = centerY + trackY * scaleY;
        const sx1 = (wire.startX - startX) * scaleX;
        const sx2 = (wire.endX - startX) * scaleX;

        const isCatenary = wire.type === "contact" || wire.type === "messenger";
        const isDpr = wire.type === "dpr_a" || wire.type === "dpr_b";
        const wireOffsetY = isCatenary ? -8 : isDpr ? -16 : -12;
        const color = isCatenary ? COLORS.catenary : isDpr ? COLORS.dpr : "#aa88ff";
        const glow = isCatenary ? COLORS.catenaryGlow : COLORS.dprGlow;
        const dash = isDpr ? "8 4" : wire.type === "feeder_25" ? "12 4" : "none";
        const width = isCatenary ? 2 : 1.5;

        return (
          <g key={wire.id}>
            {/* Glow */}
            <line
              x1={sx1} y1={sy + wireOffsetY}
              x2={sx2} y2={sy + wireOffsetY}
              stroke={glow} strokeWidth={width + 4}
            />
            {/* Wire */}
            <line
              x1={sx1} y1={sy + wireOffsetY}
              x2={sx2} y2={sy + wireOffsetY}
              stroke={color} strokeWidth={width}
              strokeDasharray={dash}
            />
          </g>
        );
      })}
    </g>
  );
}

function JunctionLayer({ anchorSections, tracks, startX, scaleX, scaleY, centerY }) {
  const elements = [];

  anchorSections.forEach((as) => {
    as.junctions?.forEach((junc) => {
      const trackY = getTrackY(tracks, as.trackId, junc.centerX);
      const sy = centerY + trackY * scaleY;
      const sx1 = (junc.spanStartX - startX) * scaleX;
      const sx2 = (junc.spanEndX - startX) * scaleX;
      const sxCenter = (junc.centerX - startX) * scaleX;
      const height = 40;
      const fill = COLORS.junction[junc.type] || COLORS.junction.insulating;
      const border = COLORS.junctionBorder[junc.type] || COLORS.junctionBorder.insulating;

      elements.push(
        <g key={junc.id}>
          {/* Зона сопряжения */}
          <rect
            x={sx1} y={sy - height}
            width={sx2 - sx1} height={height * 2}
            fill={fill} rx={4}
            stroke={border} strokeWidth={1}
            strokeDasharray="6 3"
          />
          {/* Крест изолирующего сопряжения */}
          {junc.type === "insulating" && (
            <>
              <line
                x1={sxCenter - 6} y1={sy - 20}
                x2={sxCenter + 6} y2={sy - 14}
                stroke={border} strokeWidth={2}
              />
              <line
                x1={sxCenter + 6} y1={sy - 20}
                x2={sxCenter - 6} y2={sy - 14}
                stroke={border} strokeWidth={2}
              />
            </>
          )}
          {/* Подпись */}
          <text
            x={sxCenter} y={sy - height - 6}
            fill={border} fontSize={9}
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={600}
          >
            {junc.type === "insulating" ? "ИС" : "НС"}
          </text>
        </g>
      );
    });

    // Средние анкеровки
    as.midAnchors?.forEach((ma) => {
      const trackY = getTrackY(tracks, as.trackId, ma.x);
      const sy = centerY + trackY * scaleY;
      const sx = (ma.x - startX) * scaleX;
      const dir = ma.side === "left" ? -1 : 1;

      elements.push(
        <g key={ma.id}>
          {/* Символ средней анкеровки — зигзаг */}
          <polyline
            points={`${sx},${sy - 8} ${sx + dir * 5},${sy - 14} ${sx - dir * 5},${sy - 20} ${sx + dir * 5},${sy - 26}`}
            fill="none"
            stroke={COLORS.midAnchor}
            strokeWidth={2}
          />
          <text
            x={sx} y={sy - 30}
            fill={COLORS.midAnchor} fontSize={8}
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
          >
            СА
          </text>
        </g>
      );
    });
  });

  return <g className="junction-layer">{elements}</g>;
}

function PoleSymbol({ pole, tracks, startX, scaleX, scaleY, centerY, selected, onSelect }) {
  const trackY = getTrackY(tracks, pole.trackId, pole.x);
  const poleScreenX = (pole.x - startX) * scaleX;
  const poleScreenY = centerY + pole.gabY * scaleY;
  const trackScreenY = centerY + trackY * scaleY;
  const [hovered, setHovered] = useState(false);

  const r = pole.type === "anchor" ? 6 : pole.type === "fixing" ? 5 : 4;
  const color = selected
    ? COLORS.selected
    : hovered
    ? COLORS.poleHover
    : COLORS.pole[pole.type] || COLORS.pole.intermediate;

  // Консоли
  const consoleLines = pole.consoles.map((c, i) => {
    const consoleEndY = trackScreenY;
    return (
      <line
        key={`console-${i}`}
        x1={poleScreenX} y1={poleScreenY}
        x2={poleScreenX} y2={consoleEndY}
        stroke={COLORS.console}
        strokeWidth={1}
        strokeDasharray="3 2"
      />
    );
  });

  // Attachments icons
  const attachIcons = [];
  const hasCatenary = pole.attachments.some((a) => a.type === "catenary");
  const hasDpr = pole.attachments.some((a) => a.type === "dpr");

  if (hasCatenary) {
    attachIcons.push(
      <circle
        key="cs-dot"
        cx={poleScreenX - 3} cy={poleScreenY - r - 6}
        r={2} fill={COLORS.catenary}
      />
    );
  }
  if (hasDpr) {
    attachIcons.push(
      <circle
        key="dpr-dot"
        cx={poleScreenX + 3} cy={poleScreenY - r - 6}
        r={2} fill={COLORS.dpr}
      />
    );
  }

  return (
    <g
      className="pole-symbol"
      style={{ cursor: "pointer" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(pole); }}
    >
      {/* Console lines */}
      {consoleLines}

      {/* Pole body */}
      {pole.type === "anchor" ? (
        <>
          <circle
            cx={poleScreenX} cy={poleScreenY}
            r={r} fill="none" stroke={color} strokeWidth={2}
          />
          {/* Anchor mark — small triangle */}
          <polygon
            points={`${poleScreenX},${poleScreenY - r - 2} ${poleScreenX - 4},${poleScreenY - r - 8} ${poleScreenX + 4},${poleScreenY - r - 8}`}
            fill={color}
          />
        </>
      ) : pole.type === "fixing" ? (
        <>
          <circle
            cx={poleScreenX} cy={poleScreenY}
            r={r} fill="none" stroke={color} strokeWidth={2}
          />
          <line
            x1={poleScreenX - 3} y1={poleScreenY - 3}
            x2={poleScreenX + 3} y2={poleScreenY + 3}
            stroke={color} strokeWidth={1.5}
          />
          <line
            x1={poleScreenX + 3} y1={poleScreenY - 3}
            x2={poleScreenX - 3} y2={poleScreenY + 3}
            stroke={color} strokeWidth={1.5}
          />
        </>
      ) : (
        <circle
          cx={poleScreenX} cy={poleScreenY}
          r={r} fill={color} stroke={color} strokeWidth={1}
          opacity={0.8}
        />
      )}

      {attachIcons}

      {/* Pole number — show on hover or select */}
      {(hovered || selected) && (
        <text
          x={poleScreenX} y={poleScreenY + r + 14}
          fill={color} fontSize={8}
          textAnchor="middle"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight={600}
        >
          {pole.number}
        </text>
      )}
    </g>
  );
}

function PoleLayer({ poles, tracks, startX, scaleX, scaleY, centerY, selectedId, onSelect }) {
  return (
    <g className="pole-layer">
      {poles.map((pole) => (
        <PoleSymbol
          key={pole.id}
          pole={pole}
          tracks={tracks}
          startX={startX}
          scaleX={scaleX}
          scaleY={scaleY}
          centerY={centerY}
          selected={pole.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </g>
  );
}

// ============================================================
// PROPERTIES PANEL
// ============================================================

function PropertiesPanel({ pole, onClose }) {
  if (!pole) return null;

  const typeLabels = {
    intermediate: "Промежуточная",
    anchor: "Анкерная",
    fixing: "Фиксирующая",
    flexible_cross: "Гибкая поперечина",
    rigid_cross: "Жёсткая поперечина",
    special: "Специальная",
  };
  const matLabels = {
    metal: "Металлическая",
    reinforced_concrete: "Ж/Б",
    composite: "Композитная",
  };
  const attachLabels = {
    catenary: "КС",
    dpr: "ДПР",
    feeder: "Питающий",
    return: "Обратный",
    reinforcing: "Усиливающий",
    protective: "Защитный",
  };

  return (
    <div style={{
      position: "absolute", top: 16, right: 16,
      width: 280, background: COLORS.panelBg,
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 10, padding: 16,
      color: COLORS.panelText,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12, zIndex: 100,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: COLORS.panelAccent, fontWeight: 700, fontSize: 14 }}>
          Опора {pole.number}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: "#667",
            cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
        <Label text="Тип" />
        <Val text={typeLabels[pole.type] || pole.type} />

        <Label text="Материал" />
        <Val text={matLabels[pole.material] || pole.material} />

        <Label text="Высота" />
        <Val text={`${pole.height} м`} />

        <Label text="Позиция" />
        <Val text={formatKmPkM(pole.x)} />

        <Label text="Габарит" />
        <Val text={`${Math.abs(pole.gabY).toFixed(1)} м ${pole.gabY < 0 ? "(лев.)" : "(прав.)"}`} />

        <Label text="Путь" />
        <Val text={pole.trackId} />
      </div>

      <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.panelBorder}`, paddingTop: 10 }}>
        <span style={{ color: "#667", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
          Подвеска
        </span>
        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {pole.attachments.map((a, i) => (
            <span
              key={i}
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                background: a.type === "catenary" ? "#e0555522" : a.type === "dpr" ? "#44bb7722" : "#aa88ff22",
                color: a.type === "catenary" ? COLORS.catenary : a.type === "dpr" ? COLORS.dpr : "#aa88ff",
                border: `1px solid ${a.type === "catenary" ? "#e0555544" : a.type === "dpr" ? "#44bb7744" : "#aa88ff44"}`,
              }}
            >
              {attachLabels[a.type] || a.type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Label({ text }) {
  return <span style={{ color: "#556", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{text}</span>;
}
function Val({ text }) {
  return <span style={{ color: COLORS.panelText, fontWeight: 500 }}>{text}</span>;
}

// ============================================================
// LEGEND
// ============================================================

function Legend() {
  const items = [
    { color: COLORS.catenary, label: "КС (контактная сеть)", dash: false },
    { color: COLORS.dpr, label: "ДПР", dash: true },
    { color: COLORS.pole.intermediate, label: "Промежуточная опора", shape: "circle" },
    { color: COLORS.pole.anchor, label: "Анкерная опора", shape: "triangle" },
    { color: COLORS.pole.fixing, label: "Фиксирующая опора", shape: "cross" },
    { color: COLORS.midAnchor, label: "Средняя анкеровка (СА)", shape: "zigzag" },
    { color: COLORS.junctionBorder.insulating, label: "Изолир. сопряжение (ИС)", shape: "rect" },
  ];

  return (
    <div style={{
      position: "absolute", bottom: 16, left: 16,
      background: COLORS.panelBg + "ee",
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 8, padding: "10px 14px",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, zIndex: 100,
    }}>
      <div style={{ color: "#667", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        Легенда
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <svg width={16} height={10}>
            {item.shape === "circle" && <circle cx={5} cy={5} r={3} fill={item.color} />}
            {item.shape === "triangle" && <polygon points="5,1 2,8 8,8" fill={item.color} />}
            {item.shape === "cross" && (
              <>
                <line x1={2} y1={2} x2={8} y2={8} stroke={item.color} strokeWidth={1.5} />
                <line x1={8} y1={2} x2={2} y2={8} stroke={item.color} strokeWidth={1.5} />
              </>
            )}
            {item.shape === "zigzag" && (
              <polyline points="1,8 5,2 9,8 13,2" fill="none" stroke={item.color} strokeWidth={1.5} />
            )}
            {item.shape === "rect" && <rect x={1} y={1} width={14} height={8} fill={item.color + "33"} stroke={item.color} strokeWidth={1} rx={1} />}
            {!item.shape && (
              <line x1={0} y1={5} x2={16} y2={5} stroke={item.color} strokeWidth={2}
                strokeDasharray={item.dash ? "4 2" : "none"} />
            )}
          </svg>
          <span style={{ color: COLORS.panelText }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  const data = SAMPLE_DATA;
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const [viewBox, setViewBox] = useState({
    x: 0, y: 0, w: 2400, h: 500,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [selectedPole, setSelectedPole] = useState(null);
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 600 });

  // Fit container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Scale
  const totalMeters = data.endKm - data.startKm;
  const scaleX = viewBox.w / totalMeters;
  const scaleY = 12; // pixels per meter of Y offset
  const centerY = viewBox.h / 2;

  // Pan
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest(".pole-symbol")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y });
  }, [viewBox]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = (e.clientX - panStart.x) * (viewBox.w / containerSize.w);
    const dy = (e.clientY - panStart.y) * (viewBox.h / containerSize.h);
    setViewBox((v) => ({ ...v, x: panStart.vx - dx, y: panStart.vy - dy }));
  }, [isPanning, panStart, viewBox.w, viewBox.h, containerSize]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const mx = ((e.clientX - svgRect.left) / svgRect.width) * viewBox.w + viewBox.x;
    const my = ((e.clientY - svgRect.top) / svgRect.height) * viewBox.h + viewBox.y;

    setViewBox((v) => {
      const nw = v.w * factor;
      const nh = v.h * factor;
      return {
        x: mx - (mx - v.x) * factor,
        y: my - (my - v.y) * factor,
        w: Math.max(200, Math.min(20000, nw)),
        h: Math.max(100, Math.min(5000, nh)),
      };
    });
  }, [viewBox]);

  // Zoom controls
  const zoomIn = () => setViewBox((v) => ({
    x: v.x + v.w * 0.1, y: v.y + v.h * 0.1,
    w: v.w * 0.8, h: v.h * 0.8,
  }));
  const zoomOut = () => setViewBox((v) => ({
    x: v.x - v.w * 0.125, y: v.y - v.h * 0.125,
    w: v.w * 1.25, h: v.h * 1.25,
  }));
  const resetView = () => setViewBox({ x: 0, y: 0, w: 2400, h: 500 });

  // Stats
  const poleCount = data.poles.length;
  const trackCount = data.tracks.length;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw", height: "100vh", overflow: "hidden",
        background: COLORS.bg, position: "relative",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 48, background: COLORS.panelBg,
        borderBottom: `1px solid ${COLORS.panelBorder}`,
        display: "flex", alignItems: "center",
        padding: "0 20px", zIndex: 100,
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            color: COLORS.panelAccent, fontWeight: 800, fontSize: 14,
            letterSpacing: -0.5,
          }}>
            ⚡ АС План КС
          </span>
          <span style={{ color: "#445", fontSize: 11 }}>|</span>
          <span style={{ color: COLORS.panelText, fontSize: 11, opacity: 0.7 }}>
            {data.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#556", fontSize: 10 }}>
            {trackCount} пут. · {poleCount} опор · {formatKmPkM(data.startKm)} — {formatKmPkM(data.endKm)}
          </span>
          <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {[{ label: "−", fn: zoomOut }, { label: "⊙", fn: resetView }, { label: "+", fn: zoomIn }].map((btn, i) => (
              <button
                key={i}
                onClick={btn.fn}
                style={{
                  width: 28, height: 28,
                  background: "#1a2035", border: `1px solid ${COLORS.panelBorder}`,
                  borderRadius: 6, color: COLORS.panelText,
                  cursor: "pointer", fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Viewport */}
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        style={{
          width: "100%", height: "100%", paddingTop: 48,
          cursor: isPanning ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={() => setSelectedPole(null)}
      >
        <GridLayer
          startX={data.startKm} endX={data.endKm}
          scaleX={scaleX} scaleY={scaleY}
          viewHeight={viewBox.h + viewBox.y}
        />
        <TrackLayer
          tracks={data.tracks}
          startX={data.startKm}
          scaleX={scaleX} scaleY={scaleY}
          centerY={centerY}
        />
        <WireLayer
          wires={data.wires}
          tracks={data.tracks}
          startX={data.startKm}
          scaleX={scaleX} scaleY={scaleY}
          centerY={centerY}
        />
        <JunctionLayer
          anchorSections={data.anchorSections}
          tracks={data.tracks}
          startX={data.startKm}
          scaleX={scaleX} scaleY={scaleY}
          centerY={centerY}
        />
        <PoleLayer
          poles={data.poles}
          tracks={data.tracks}
          startX={data.startKm}
          scaleX={scaleX} scaleY={scaleY}
          centerY={centerY}
          selectedId={selectedPole?.id}
          onSelect={setSelectedPole}
        />
      </svg>

      {/* Properties Panel */}
      <PropertiesPanel pole={selectedPole} onClose={() => setSelectedPole(null)} />

      {/* Legend */}
      <Legend />

      {/* Instructions */}
      <div style={{
        position: "absolute", bottom: 16, right: 16,
        background: COLORS.panelBg + "cc",
        border: `1px solid ${COLORS.panelBorder}`,
        borderRadius: 8, padding: "8px 12px",
        fontSize: 9, color: "#556", zIndex: 100,
      }}>
        Scroll — zoom · Drag — pan · Click опору — свойства
      </div>
    </div>
  );
}
