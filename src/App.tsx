import { For, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { PARAM_KEYS, PARAM_SPECS, amphoraPaths, makeDna, type Dna } from "./amphora";

const COUNT = 100;

function newSeeds(): string[] {
  const base = Math.random().toString(36).slice(2, 8);
  return Array.from({ length: COUNT }, (_, i) => `${base}-${i}`);
}

export function App() {
  // Mean of each parameter (0..1), tuned by the sliders.
  const [means, setMeans] = createStore<Dna>(
    Object.fromEntries(PARAM_KEYS.map((k) => [k, 0.5])) as Dna,
  );
  const [variation, setVariation] = createSignal(0.3);
  const [seeds, setSeeds] = createSignal(newSeeds());

  // Seeds stay fixed, so moving a slider re-renders the same pots live.
  const pots = createMemo(() =>
    seeds().map((seed) => ({
      seed,
      paths: amphoraPaths(makeDna(seed, { ...means }, variation())),
    })),
  );

  return (
    <div style={{ display: "flex", "font-family": "sans-serif" }}>
      <aside style={{ width: "280px", padding: "12px", position: "sticky", top: 0, height: "100vh", "overflow-y": "auto" }}>
        <button onClick={() => setSeeds(newSeeds())} style={{ width: "100%", padding: "8px" }}>
          Generate
        </button>
        <For each={PARAM_KEYS}>
          {(k) => (
            <label style={{ display: "block", "margin-top": "10px", "font-size": "13px" }}>
              {PARAM_SPECS[k].label}: {means[k].toFixed(2)}
              <input
                type="range" min="0" max="1" step="0.01"
                value={means[k]}
                onInput={(e) => setMeans(k, e.currentTarget.valueAsNumber)}
                style={{ width: "100%" }}
              />
            </label>
          )}
        </For>
        <label style={{ display: "block", "margin-top": "10px", "font-size": "13px" }}>
          Variation: {variation().toFixed(2)}
          <input
            type="range" min="0" max="1" step="0.01"
            value={variation()}
            onInput={(e) => setVariation(e.currentTarget.valueAsNumber)}
            style={{ width: "100%" }}
          />
        </label>
      </aside>
      <main style={{ flex: 1, display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px", padding: "12px" }}>
        <For each={pots()}>
          {(p) => (
            <svg viewBox="-90 -10 180 350">
              <title>{p.seed}</title>
              <path d={p.paths.handles} fill="none" stroke="#7a3b1d" stroke-width="5" stroke-linecap="round" />
              <path d={p.paths.body} fill="#c4673a" stroke="#7a3b1d" stroke-width="2" />
            </svg>
          )}
        </For>
      </main>
    </div>
  );
}
