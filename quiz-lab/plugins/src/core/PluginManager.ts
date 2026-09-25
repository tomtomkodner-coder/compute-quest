import type { LabPlugin, PluginContext } from "./types";
import type { PluginId } from "./settings";

type HookName = {
  [K in keyof LabPlugin]-?: NonNullable<LabPlugin[K]> extends (...args: never[]) => unknown ? K : never;
}[keyof LabPlugin];

type HookArgs<K extends HookName> = NonNullable<LabPlugin[K]> extends (ctx: PluginContext, ...args: infer A) => unknown
  ? A
  : never;

/**
 * Registry of independent plugin modules. Each plugin is enabled/disabled on its own, receives
 * lifecycle hooks in `order`, and is isolated: an exception in one plugin never affects others.
 */
export class PluginManager {
  private readonly plugins = new Map<PluginId, LabPlugin>();
  private readonly enabled = new Set<PluginId>();
  private readonly contexts = new Map<PluginId, PluginContext>();

  constructor(
    plugins: LabPlugin[],
    private readonly makeContext: (plugin: LabPlugin) => PluginContext,
    private readonly onError: (plugin: LabPlugin, hook: string, err: unknown) => void = () => {},
  ) {
    for (const p of [...plugins].sort((a, b) => a.order - b.order)) {
      if (this.plugins.has(p.id)) throw new Error(`Duplicate plugin id "${p.id}"`);
      this.plugins.set(p.id, p);
    }
  }

  list(): LabPlugin[] {
    return [...this.plugins.values()];
  }

  get(id: PluginId): LabPlugin | undefined {
    return this.plugins.get(id);
  }

  isEnabled(id: PluginId): boolean {
    return this.enabled.has(id);
  }

  setEnabled(id: PluginId, value: boolean): void {
    const plugin = this.plugins.get(id);
    if (!plugin || this.enabled.has(id) === value) return;
    if (value) {
      this.enabled.add(id);
      this.call(plugin, "onEnable");
    } else {
      this.call(plugin, "onDisable");
      this.enabled.delete(id);
    }
  }

  /** Apply an enabled-map (e.g. from settings), calling onEnable/onDisable for changes only. */
  sync(state: Partial<Record<PluginId, boolean>>): void {
    for (const id of this.plugins.keys()) this.setEnabled(id, !!state[id]);
  }

  context(id: PluginId): PluginContext {
    let ctx = this.contexts.get(id);
    if (!ctx) {
      ctx = this.makeContext(this.plugins.get(id)!);
      this.contexts.set(id, ctx);
    }
    return ctx;
  }

  /** Invoke a hook on every enabled plugin, in order. */
  dispatch<K extends HookName>(hook: K, ...args: HookArgs<K>): void {
    for (const plugin of this.plugins.values()) {
      if (!this.enabled.has(plugin.id)) continue;
      this.call(plugin, hook, ...args);
    }
  }

  private call<K extends HookName>(plugin: LabPlugin, hook: K, ...args: HookArgs<K> | []): void {
    const fn = plugin[hook] as ((ctx: PluginContext, ...a: unknown[]) => void) | undefined;
    if (!fn) return;
    try {
      fn.call(plugin, this.context(plugin.id), ...args);
    } catch (err) {
      this.onError(plugin, hook, err);
    }
  }

  disableAll(): void {
    for (const id of [...this.enabled]) this.setEnabled(id, false);
  }
}
