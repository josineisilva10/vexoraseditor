const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 47831;
const APP_URL = `http://127.0.0.1:${PORT}`;
let serverProcess;
let mainWindow;
let logStream;

function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  if (logStream) logStream.write(line);
}

function getServerEntry() {
  if (app.isPackaged) {
    // With ASAR disabled, electron-builder places app files directly in resources/app.
    return path.join(process.resourcesPath, "app", ".output", "server", "index.mjs");
  }
  return path.join(__dirname, "..", ".output", "server", "index.mjs");
}

function getRuntimeRoot(entry) {
  // Nitro expects to run with the project output directory's parent as cwd,
  // so relative public-asset paths resolve to .output/public.
  return path.dirname(path.dirname(path.dirname(entry)));
}

function waitForPort(port, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Servidor local não respondeu na porta ${port}. Consulte o log em Documentos\\VEXORA-SAMPLER\\startup.log.`));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

async function startLocalServer() {
  const entry = getServerEntry();
  const runtimeRoot = getRuntimeRoot(entry);
  const publicDir = path.join(runtimeRoot, ".output", "public");
  writeLog(`Starting server. packaged=${app.isPackaged}; entry=${entry}; cwd=${runtimeRoot}; publicDir=${publicDir}`);

  if (!fs.existsSync(entry)) throw new Error(`Arquivo do servidor não encontrado: ${entry}`);
  if (!fs.existsSync(publicDir)) throw new Error(`Arquivos públicos não encontrados: ${publicDir}`);

  serverProcess = spawn(process.execPath, [entry], {
    cwd: runtimeRoot,
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: "127.0.0.1",
      NITRO_HOST: "127.0.0.1",
      PORT: String(PORT),
      NITRO_PORT: String(PORT),
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => writeLog(`SERVER OUT: ${chunk.toString().trim()}`));
  serverProcess.stderr.on("data", (chunk) => writeLog(`SERVER ERR: ${chunk.toString().trim()}`));
  serverProcess.once("error", (error) => writeLog(`SERVER PROCESS ERROR: ${error.stack || error}`));
  serverProcess.once("exit", (code, signal) => writeLog(`SERVER EXIT: code=${code}; signal=${signal}`));
  await waitForPort(PORT);
  writeLog(`Server responded on port ${PORT}`);
}

async function createWindow() {
  try {
    const logDir = path.join(app.getPath("documents"), "VEXORA-SAMPLER");
    fs.mkdirSync(logDir, { recursive: true });
    logStream = fs.createWriteStream(path.join(logDir, "startup.log"), { flags: "a" });
    await startLocalServer();
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 980,
      minHeight: 650,
      backgroundColor: "#080812",
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
      writeLog(`WEBVIEW LOAD FAILED: code=${code}; description=${description}; url=${url}`);
    });
    mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      writeLog(`WEBVIEW CONSOLE: level=${level}; message=${message}; source=${sourceId}:${line}`);
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith(APP_URL)) return { action: "allow" };
      return { action: "deny" };
    });
    await mainWindow.loadURL(APP_URL);
  } catch (error) {
    writeLog(`STARTUP ERROR: ${error.stack || error}`);
    dialog.showErrorBox(
      "VEXORA SAMPLER",
      `Não foi possível iniciar o aplicativo.\n\n${error.message}\n\nO diagnóstico foi salvo em Documentos\\VEXORA-SAMPLER\\startup.log.`,
    );
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  if (logStream) logStream.end();
});
