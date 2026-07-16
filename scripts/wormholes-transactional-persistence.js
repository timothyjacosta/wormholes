/* GENERATED from scripts/modules/transactional-persistence.mjs. Do not edit this compatibility adapter directly. */
(function(){
  "use strict";
  const PHASE_ORDER = Object.freeze({
    "large-content": 10,
    "record-metadata": 20,
    "collection-metadata": 30,
    "core-metadata": 40,
  });
  
  function clonePlain(value, fallback = null) {
    if (value === undefined) return fallback;
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
    } catch (error) {}
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
  }
  
  function normalizeList(value) {
    return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  }
  
  function stepRank(step) {
    const phase = String(step?.phase || "record-metadata");
    if (!Object.prototype.hasOwnProperty.call(PHASE_ORDER, phase)) {
      throw new TypeError(`Unknown persistence phase: ${phase}`);
    }
    return PHASE_ORDER[phase];
  }
  
  function transactionError(message, options = {}) {
    const error = options.cause instanceof Error ? options.cause : new Error(String(message || ""));
    if (!error.message) error.message = String(message || "Persistence transaction failed.");
    error.name = error.name || "WormholesPersistenceTransactionError";
    error.code = error.code || "WORMHOLES_TRANSACTION_FAILED";
    error.userMessage = String(
      options.userMessage ||
        error.userMessage ||
        "Your changes could not be saved. Nothing was changed.",
    );
    if (options.operation) error.operation = String(options.operation);
    if (options.phase) error.phase = String(options.phase);
    if (options.step) error.step = String(options.step);
    return error;
  }
  
  function assertSuccessfulResult(result, context = {}) {
    if (result === false || result?.ok === false) {
      throw transactionError(result?.userMessage || "A save step failed.", {
        cause: result?.error,
        userMessage: result?.userMessage,
        ...context,
      });
    }
    return result;
  }
  
  async function maybeInjectFailure(target, context) {
    const injector = target.WormholesPersistenceFailureInjector;
    if (typeof injector !== "function") return;
    const result = await injector(Object.freeze({...context}));
    if (result === true) {
      throw transactionError("Injected persistence failure.", {
        operation: context.operation,
        phase: context.phase,
        step: context.step,
      });
    }
  }
  
  function installTransactionalPersistence(target = globalThis) {
    if (target.WormholesTransactionalPersistence) return target.WormholesTransactionalPersistence;
  
    let activeOperation = "";
  
    async function validatePlan(plan = {}) {
      const operation = String(plan.operation || "save changes");
      const validators = normalizeList(plan.validate);
      const steps = normalizeList(plan.steps).map((step, index) => ({
        ...step,
        name: String(step?.name || `step-${index + 1}`),
        phase: String(step?.phase || "record-metadata"),
        originalIndex: index,
      }));
  
      let previousRank = 0;
      for (const step of steps) {
        const rank = stepRank(step);
        if (rank < previousRank) {
          throw transactionError(
            "Persistence steps are out of order. Large content must be written before metadata.",
            {operation, phase: step.phase, step: step.name},
          );
        }
        previousRank = rank;
      }
  
      for (const validate of validators) {
        if (typeof validate !== "function") {
          throw new TypeError("Persistence validators must be functions.");
        }
        assertSuccessfulResult(await validate(), {operation, phase: "validation", step: "validate"});
      }
  
      for (const step of steps) {
        if (typeof step.execute !== "function") {
          throw new TypeError(`Persistence step ${step.name} is missing an execute function.`);
        }
        if (typeof step.validate === "function") {
          assertSuccessfulResult(await step.validate(), {
            operation,
            phase: "validation",
            step: step.name,
          });
        }
      }
  
      return Object.freeze({operation, validators, steps});
    }
  
    async function run(plan = {}) {
      const normalized = await validatePlan(plan);
      if (activeOperation) {
        throw transactionError("Another save is already in progress.", {
          operation: normalized.operation,
          userMessage: "Another save is still finishing. Try again in a moment.",
        });
      }
  
      activeOperation = normalized.operation;
      const completed = [];
      const runtimeSnapshot =
        typeof plan.captureRuntime === "function"
          ? clonePlain(await plan.captureRuntime(), null)
          : null;
  
      try {
        for (const step of normalized.steps) {
          await maybeInjectFailure(target, {
            operation: normalized.operation,
            phase: step.phase,
            step: step.name,
            index: step.originalIndex,
          });
          const result = await step.execute();
          assertSuccessfulResult(result, {
            operation: normalized.operation,
            phase: step.phase,
            step: step.name,
          });
          completed.push(step);
        }
  
        if (typeof plan.commitRuntime === "function") {
          await plan.commitRuntime(runtimeSnapshot);
        }
  
        return Object.freeze({
          ok: true,
          operation: normalized.operation,
          completed: completed.map((step) => step.name),
        });
      } catch (cause) {
        const rollbackErrors = [];
        for (const step of [...completed].reverse()) {
          if (typeof step.rollback !== "function") continue;
          try {
            await step.rollback(cause);
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
          }
        }
        if (typeof plan.rollback === "function") {
          try {
            await plan.rollback({
              cause,
              completed: completed.map((step) => step.name),
              runtimeSnapshot,
            });
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
          }
        }
        if (typeof plan.restoreRuntime === "function") {
          try {
            await plan.restoreRuntime(runtimeSnapshot, cause);
          } catch (rollbackError) {
            rollbackErrors.push(rollbackError);
          }
        }
  
        const error = transactionError(cause?.message || "Persistence transaction failed.", {
          cause,
          userMessage: plan.failureMessage || cause?.userMessage,
          operation: normalized.operation,
          phase: cause?.phase,
          step: cause?.step,
        });
        error.completedSteps = completed.map((step) => step.name);
        error.rollbackErrors = rollbackErrors;
        throw error;
      } finally {
        activeOperation = "";
      }
    }
  
    const api = Object.freeze({
      PHASE_ORDER,
      run,
      validatePlan,
      assertSuccessfulResult,
      clonePlain,
      get activeOperation() {
        return activeOperation;
      },
    });
    target.WormholesTransactionalPersistence = api;
    return api;
  }
  
  const api =
    typeof window !== "undefined" ? installTransactionalPersistence(window) : Object.freeze({});
})();
