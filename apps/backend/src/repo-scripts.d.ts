declare module "@repo/port-in-use-hint" {
  export function formatPortInUseMessage(port: number, label: string): string;
}
