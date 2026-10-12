const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const PORT = 47831;
const APP_URL = `http://127.0.0.1:${PORT}`;
let serverProcess;
let mainWindow;

function getServerEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked", ".output", "server", "index.mjs");
  }
  return path.join(__dirname, "..", ".output", "server", "index.mjs");
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
          reject(new Error("O servidor local do VEXORA SAMPLER não iniciou a tempo."));
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
  serverProcess = spawn(process.execPath, [entry], {
    cwd: path.dirname(path.dirname(entry)),
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
    stdio: "ignore",
  });

  serverProcess.once("error", (error) => {
    console.error("Falha ao iniciar o servidor local:", error);
  });
  await waitForPort(PORT);
}

async function createWindow() {
  try {
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
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith(APP_URL)) return { action: "allow" };
      return { action: "deny" };
    });
    await mainWindow.loadURL(APP_URL);
  } catch (error) {
    dialog.showErrorBox(
      "VEXORA SAMPLER",
      `Não foi possível iniciar o aplicativo.\n\n${error.message}\n\nTente reinstalar o programa.`,
    );
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
