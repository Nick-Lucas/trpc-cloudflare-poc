/**
 * Counter Durable Object
 * A simple counter that persists its state across requests and can be accessed by multiple clients
 */

import { DurableObject } from "cloudflare:workers";

export class CounterDO extends DurableObject<Env> {
  private state: DurableObjectState;
  private count: number | null = null;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    
    this.state = state;
  }
  
  async value() {
    if (this.count === null) {
      this.count = await this.state.storage.get('count') || 0;
    }
    return this.count;
  }

  async increment() {
    if (this.count === null) {
      this.count = await this.state.storage.get('count') || 0;
    }
    this.count++;
    await this.state.storage.put('count', this.count);
    return this.count;
  }

  async decrement() {
    if (this.count === null) {
      this.count = await this.state.storage.get('count') || 0;
    }
    this.count--;
    await this.state.storage.put('count', this.count);
    return this.count;
  }

  async reset() {
    this.count = 0;
    await this.state.storage.put('count', this.count);
    return this.count;
  }
}
