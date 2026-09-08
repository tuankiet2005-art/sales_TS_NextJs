import net from "node:net";
import { platform } from "node:os";

/**
 * @param {number} port
 * @param {string} [service]
 */
export function formatPortInUseMessage(port, service = "server") {
  const isWin = platform() === "win32";
  const reason = `Port ${port} is already in use — another process is listening, so the ${service} cannot start.`;
  const solution = isWin
    ? `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
    : `kill -9 $(lsof -t -i:${port})`;

  return `\n${reason}\nSolution: ${solution}\n`;
}

/**
 * @param {number} port
 */
export function checkPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.once("listening", () => {
      server.close((closeErr) => {
        if (closeErr) {
          reject(closeErr);
          return;
        }
        resolve();
      });
    });
    server.listen(port);
  });
}

/**
 * @param {number} port
 * @param {string} [service]
 */
export async function exitIfPortInUse(port, service) {
  try {
    await checkPortAvailable(port);
  } catch (err) {
    if (err?.code === "EADDRINUSE") {
      console.error(formatPortInUseMessage(port, service));
      process.exit(1);
    }
    throw err;
  }
}
