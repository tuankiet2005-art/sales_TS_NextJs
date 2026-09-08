declare module "@repo/port-in-use-hint" {
  export function formatStopPortCommand(port: number): string;
  export function formatPortInUseMessage(port: number, service?: string): string;
}
