/**
 * Counter Durable Object
 * A simple counter that persists its state across requests and can be accessed by multiple clients
 */

export class CounterDO implements DurableObject {
  private state: DurableObjectState;
  private count: number | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // Handle HTTP requests to the Durable Object
  async fetch(request: Request): Promise<Response> {
    // Get current url to route the request
    const url = new URL(request.url);
    
    // Handle based on the request method and path
    if (request.method === 'GET' && url.pathname === '/') {
      // Initialize the counter if it doesn't exist
      if (this.count === null) {
        this.count = await this.state.storage.get('count') || 0;
      }
      return new Response(JSON.stringify({ count: this.count }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (request.method === 'POST' && url.pathname === '/increment') {
      // Initialize the counter if it doesn't exist
      if (this.count === null) {
        this.count = await this.state.storage.get('count') || 0;
      }
      
      // Increment and persist the new count
      this.count++;
      await this.state.storage.put('count', this.count);
      
      return new Response(JSON.stringify({ count: this.count }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (request.method === 'POST' && url.pathname === '/decrement') {
      // Initialize the counter if it doesn't exist
      if (this.count === null) {
        this.count = await this.state.storage.get('count') || 0;
      }
      
      // Decrement and persist the new count
      this.count--;
      await this.state.storage.put('count', this.count);
      
      return new Response(JSON.stringify({ count: this.count }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (request.method === 'POST' && url.pathname === '/reset') {
      // Reset the counter to 0
      this.count = 0;
      await this.state.storage.put('count', this.count);
      
      return new Response(JSON.stringify({ count: this.count }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return 404 for any other request
    return new Response('Not found', { status: 404 });
  }
}
