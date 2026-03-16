import { TernEvent } from "./types";

export class EventStore {
  private events: TernEvent[] = [];

  constructor(private readonly maxEvents: number) {}

  add(event: TernEvent): void {
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.length = this.maxEvents;
    }
  }

  list(): TernEvent[] {
    return [...this.events];
  }

  get(id: string): TernEvent | undefined {
    return this.events.find((event) => event.id === id);
  }

  update(id: string, patch: Partial<TernEvent>): TernEvent | null {
    const event = this.get(id);
    if (!event) {
      return null;
    }

    Object.assign(event, patch);
    return event;
  }

  clear(): void {
    this.events = [];
  }
}
