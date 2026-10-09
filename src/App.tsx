import { For, Index, Show, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { SHAPE_SPECS, amphoraPaths, geometry, type ShapeDna } from "./amphora";
import { DECO_SPECS, decorate, type DecoDna } from "./decoration";
import { choiceIndex, defaultDna, keysOf, makeDna, type Spec, type Specs } from "./params";

const COUNT = 100;
const OUTLINE = "#2b1a12";
const TABS = ["shape", "decoration"] as const;
const LABEL_STYLE = { display: "block", "margin-top": "10px", "font-size": "13px" } as const;

function newSeeds(): string[] {
  const base = Math.random().toString(36).slice(2, 8);
  return Array.from({ length: COUNT }, (_, i) => `${base}-${i}`);
}

// Slider readout: the chosen option's name for choice parameters, else the value.
function shown(spec: Spec, v: number): string {
  return spec.choices ? spec.choices[choiceIndex(v, spec.choices.length)] : v.toFixed(2);
}

function Slider(props: { label: string; value: number; onInput: (v: number) => void }) {
  return (
    <label style={LABEL_STYLE}>
      {props.label}
      <input
        type="range" min="0" max="1" step="0.01"
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.valueAsNumber)}
        style={{ width: "100%" }}
      />
    </label>
  );
}

// One slider per parameter of a spec set, plus its variation slider.
function Sliders(props: {
  specs: Specs;
  means: Record<string, number>;
  variation: number;
  onMean: (key: string, value: number) => void;
  onVariation: (value: number) => void;
}) {
  return (
    <>
      <For each={keysOf(props.specs)}>
        {(k) => (
          <Slider
            label={`${props.specs[k].label}: ${shown(props.specs[k], props.means[k])}`}
            value={props.means[k]}
            onInput={(v) => props.onMean(k, v)}
          />
        )}
      </For>
      <Slider
        label={`Variation: ${props.variation.toFixed(2)}`}
        value={props.variation}
        onInput={props.onVariation}
      />
    </>
  );
}

export function App() {
  const [tab, setTab] = createSignal<(typeof TABS)[number]>("shape");
  // Mean of each parameter (0..1), tuned by the sliders. Shape and decoration are independent.
  const [shapeMeans, setShapeMeans] = createStore<ShapeDna>(defaultDna(SHAPE_SPECS));
  const [decoMeans, setDecoMeans] = createStore<DecoDna>(defaultDna(DECO_SPECS));
  const [shapeVariation, setShapeVariation] = createSignal(0.3);
  const [decoVariation, setDecoVariation] = createSignal(0.3);
  const [seeds, setSeeds] = createSignal(newSeeds());

  // Seeds stay fixed, so moving a slider re-renders the same pots live.
  // Shapes only depend on the shape tab, so moving decoration sliders skips this step.
  const shapes = createMemo(() =>
    seeds().map((seed) => {
      const g = geometry(makeDna(SHAPE_SPECS, seed, { ...shapeMeans }, shapeVariation()));
      return { seed, g, paths: amphoraPaths(g) };
    }),
  );
  // The decoration DNA uses its own seed salt, so it never changes the shape DNA.
  const pots = createMemo(() =>
    shapes().map((s) => ({
      ...s,
      deco: decorate(s.g, makeDna(DECO_SPECS, `${s.seed}/deco`, { ...decoMeans }, decoVariation())),
    })),
  );

  return (
    <div style={{ display: "flex", "font-family": "sans-serif" }}>
      <aside style={{ width: "280px", padding: "12px", position: "sticky", top: 0, height: "100vh", "overflow-y": "auto" }}>
        <button onClick={() => setSeeds(newSeeds())} style={{ width: "100%", padding: "8px" }}>
          Generate
        </button>
        <div style={{ display: "flex", gap: "4px", "margin-top": "10px" }}>
          <For each={TABS}>
            {(t) => (
              <button
                onClick={() => setTab(t)}
                style={{ flex: 1, padding: "6px", "font-weight": tab() === t ? "bold" : "normal" }}
              >
                {t}
              </button>
            )}
          </For>
        </div>
        <Show
          when={tab() === "shape"}
          fallback={
            <Sliders
              specs={DECO_SPECS}
              means={decoMeans}
              variation={decoVariation()}
              onMean={(k, v) => setDecoMeans(k as keyof DecoDna, v)}
              onVariation={setDecoVariation}
            />
          }
        >
          <Sliders
            specs={SHAPE_SPECS}
            means={shapeMeans}
            variation={shapeVariation()}
            onMean={(k, v) => setShapeMeans(k as keyof ShapeDna, v)}
            onVariation={setShapeVariation}
          />
        </Show>
      </aside>
      <main style={{ flex: 1, display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px", padding: "12px" }}>
        <Index each={pots()}>
          {(p) => (
            <svg viewBox="-90 -10 180 350">
              <title>{p().seed}</title>
              <clipPath id={`clip-${p().seed}`}>
                <path d={p().paths.body} />
              </clipPath>
              <path d={p().paths.handles} fill="none" stroke={OUTLINE} stroke-width="5" stroke-linecap="round" />
              <path d={p().paths.body} fill={p().deco.ground} />
              <g clip-path={`url(#clip-${p().seed})`}>
                <path d={p().deco.fills} fill={p().deco.ink} />
                <path
                  d={p().deco.lines}
                  fill="none"
                  stroke={p().deco.ink}
                  stroke-width={p().deco.lineWidth}
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </g>
              <path d={p().paths.body} fill="none" stroke={OUTLINE} stroke-width="2" />
            </svg>
          )}
        </Index>
      </main>
    </div>
  );
}
