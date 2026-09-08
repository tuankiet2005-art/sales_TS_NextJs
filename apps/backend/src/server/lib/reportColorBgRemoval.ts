/** Whether the Node API runs @imgly/background-removal-node (off on Windows and Vercel). */
export function isReportColorBackgroundRemovedOnServer(): boolean {
  const override = process.env.REPORT_COLOR_BG_REMOVAL?.trim().toLowerCase();
  if (override === "1" || override === "true") {
    return true;
  }
  if (override === "0" || override === "false") {
    return false;
  }
  // Native ONNX runtime is unavailable on Vercel serverless and can crash on Windows.
  if (process.env.VERCEL || process.platform === "win32") {
    return false;
  }
  return true;
}
