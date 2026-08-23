export class HarnessCapabilityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "HarnessCapabilityError";
    this.code = code;
  }
}

function assertKey(value, label) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]*$/u.test(value)) {
    throw new HarnessCapabilityError(
      "INVALID_CAPABILITY_KEY",
      `${label} must match /^[a-z][a-z0-9-]*$/`,
    );
  }
}

/**
 * Tiny capability/plugin context inspired by DeepSeek Harness/Cordis seams.
 *
 * The context owns registration identity and teardown only. It deliberately
 * knows nothing about GitHub, Codex, worktrees, policy or task semantics.
 */
export class HarnessContext {
  #providers = new Map();
  #effects = [];
  #disposed = false;

  provide(capability, name, provider) {
    if (this.#disposed) {
      throw new HarnessCapabilityError("CONTEXT_DISPOSED", "harness context is disposed");
    }
    assertKey(capability, "capability");
    assertKey(name, "provider name");
    if (provider === null || (typeof provider !== "object" && typeof provider !== "function")) {
      throw new HarnessCapabilityError("INVALID_PROVIDER", "provider must be an object or function");
    }

    let providers = this.#providers.get(capability);
    if (!providers) {
      providers = new Map();
      this.#providers.set(capability, providers);
    }
    if (providers.has(name)) {
      throw new HarnessCapabilityError(
        "PROVIDER_CONFLICT",
        `provider already registered for ${capability}/${name}`,
      );
    }

    providers.set(name, provider);
    let active = true;
    const dispose = () => {
      if (!active) return;
      active = false;
      if (providers.get(name) === provider) providers.delete(name);
      if (providers.size === 0) this.#providers.delete(capability);
    };
    this.#effects.push(dispose);
    return dispose;
  }

  resolve(capability, name) {
    assertKey(capability, "capability");
    assertKey(name, "provider name");
    const provider = this.#providers.get(capability)?.get(name);
    if (!provider) {
      throw new HarnessCapabilityError(
        "PROVIDER_UNAVAILABLE",
        `provider is unavailable: ${capability}/${name}`,
      );
    }
    return provider;
  }

  list(capability) {
    assertKey(capability, "capability");
    return [...(this.#providers.get(capability)?.keys() ?? [])].sort();
  }

  effect(dispose) {
    if (typeof dispose !== "function") {
      throw new HarnessCapabilityError("INVALID_EFFECT", "effect disposer must be a function");
    }
    if (this.#disposed) {
      throw new HarnessCapabilityError("CONTEXT_DISPOSED", "harness context is disposed");
    }
    this.#effects.push(dispose);
    return dispose;
  }

  /**
   * Mount one plugin transactionally. Any registrations/effects added by a
   * failing plugin are unwound before the failure escapes.
   */
  async use(plugin, config = undefined) {
    if (typeof plugin !== "function") {
      throw new HarnessCapabilityError("INVALID_PLUGIN", "plugin must be a function");
    }
    if (this.#disposed) {
      throw new HarnessCapabilityError("CONTEXT_DISPOSED", "harness context is disposed");
    }

    const start = this.#effects.length;
    try {
      const cleanup = await plugin(this, config);
      if (cleanup !== undefined) this.effect(cleanup);
    } catch (error) {
      await this.#disposeFrom(start);
      throw error;
    }
  }

  async #disposeFrom(start) {
    const owned = this.#effects.splice(start).reverse();
    const failures = [];
    for (const dispose of owned) {
      try {
        await dispose();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, "one or more harness effects failed to dispose");
    }
  }

  async dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.#disposeFrom(0);
  }
}
