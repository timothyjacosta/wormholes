/* Wormholes Beta 248 collection density controls. */
/* Canonical ES-module source. The direct-file build uses a generated classic adapter. */

export function install(root = globalThis) {
  const global = root.window || root;
  const window = global;
  const document = root.document || global.document;

  const DEFAULT_VALUE = 2;
  const DENSITY_BY_VALUE = Object.freeze({
    1: {key: "compact", label: "Compact"},
    2: {key: "comfortable", label: "Comfortable"},
    3: {key: "spacious", label: "Spacious"},
  });
  const CONFIG = Object.freeze({
    archive: {
      sliderId: "archiveDensitySlider",
      valueId: "archiveDensityValue",
      targetId: "archiveListScreen",
    },
    literature: {
      sliderId: "literatureDensitySlider",
      valueId: "literatureDensityValue",
      targetId: "literatureListScreen",
    },
    vision: {
      sliderId: "visionDensitySlider",
      valueId: "visionDensityValue",
      targetId: "visionTab",
    },
  });

  function normalizedValue(value) {
    const number = Math.round(Number(value));
    return DENSITY_BY_VALUE[number] ? number : DEFAULT_VALUE;
  }

  function apply(tabName, value = DEFAULT_VALUE) {
    const config = CONFIG[tabName];
    if (!config) return null;
    const safeValue = normalizedValue(value);
    const density = DENSITY_BY_VALUE[safeValue];
    const slider = document.getElementById(config.sliderId);
    const output = document.getElementById(config.valueId);
    const target = document.getElementById(config.targetId);

    if (slider) {
      slider.value = String(safeValue);
      slider.setAttribute("aria-valuetext", density.label);
    }
    if (output) output.textContent = density.label;
    if (target) target.dataset.density = density.key;
    return density.key;
  }

  function reset(tabName) {
    return apply(tabName, DEFAULT_VALUE);
  }

  function initialize() {
    Object.entries(CONFIG).forEach(([tabName, config]) => {
      const slider = document.getElementById(config.sliderId);
      if (!slider || slider.dataset.densityBound === "true") return;
      slider.dataset.densityBound = "true";
      slider.addEventListener("input", (event) => apply(tabName, event.target.value));
      apply(tabName, slider.value);
    });
  }

  window.WormholesDensity = Object.freeze({
    DEFAULT_VALUE,
    DENSITY_BY_VALUE,
    apply,
    reset,
    initialize,
  });
  return window.WormholesDensity;
}

export const api = install(globalThis);
export default api;
