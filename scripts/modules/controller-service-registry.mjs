/* Wormholes Beta 250 controller service registry.
   Canonical controllers import this small contract instead of reaching across
   feature boundaries through bare global function references. The direct-file
   compatibility build generates a classic adapter from this module. */

const registeredControllerServices = Object.create(null);

export const controllerServices = new Proxy(registeredControllerServices, {
  get(target, property) {
    if (property in target) return target[property];
    return globalThis[property];
  },
  has(target, property) {
    return property in target || property in globalThis;
  },
});

export function registerControllerServices(api = {}, target = globalThis) {
  if (!api || typeof api !== "object") return controllerServices;
  Object.assign(registeredControllerServices, api);
  Object.assign(target, api);
  return controllerServices;
}

export function controllerServiceSnapshot() {
  return Object.freeze({...registeredControllerServices});
}

export function installLegacyControllerServiceBindings(target = globalThis) {
  target.controllerServices = controllerServices;
  target.registerControllerServices = registerControllerServices;
  target.WormholesControllerServices = Object.freeze({
    services: controllerServices,
    register: registerControllerServices,
    snapshot: controllerServiceSnapshot,
  });
  return target.WormholesControllerServices;
}

if (typeof window !== "undefined") installLegacyControllerServiceBindings(window);
