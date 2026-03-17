import { TernEvent } from "./types";

export class EventStore {
  private events: TernEvent[] = [];

  constructor(private readonly maxEvents: number) {}

  add(event: TernEvent): void {
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.splice(this.maxEvents);
    }
  }

  list(): TernEvent[] {
    return [...this.events];
  }

  get(id: string): TernEvent | undefined {
    return this.events.find((event) => event.id === id);
  }

  clear(): void {
    this.events = [];
  }
}
