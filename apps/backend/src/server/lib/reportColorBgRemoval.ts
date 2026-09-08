/** Whether the Node API runs @imgly/background-removal-node (off on Windows by default). */
export function isReportColorBackgroundRemovedOnServer(): boolean {
  const override = process.env.REPORT_COLOR_BG_REMOVAL?.trim().toLowerCase();
  if (override === "1" || override === "true") {
    return true;
  }
  if (override === "0" || override === "false") {
    return false;
  }
  // @imgly/background-removal-node can crash Node on Windows (GLib access violation).
  return process.platform !== "win32";
}
