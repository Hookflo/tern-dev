declare module "@clack/prompts" {
  export function intro(message: string): void;
  export function outro(message: string): void;
  export function note(message: string, title?: string): void;
  export function cancel(message: string): void;
  export const log: {
    success(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    step(message: string): void;
  };
  export function isCancel(value: unknown): boolean;
  export function confirm(options: { message: string }): Promise<boolean>;
  export function select<T>(options: {
    message: string;
    options: Array<{ value: T; label: string }>;
  }): Promise<T>;
  export function text(options: {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string) => string | void;
  }): Promise<string>;
  export function spinner(): {
    start(message: string): void;
    stop(message?: string): void;
  };
}
