// Capturas de la web LOCAL para la landing (Chrome sin interfaz, protocolo DevTools).
// Uso: node scripts/capture-screens.mjs <carpeta-de-salida>
// Solo contra localhost; el login usa el usuario de demostracion del seed local.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const OUT = process.argv[2];
if (!OUT) throw new Error("Falta la carpeta de salida");
mkdirSync(OUT, { recursive: true });

const MEMBER_ID = process.env.MEMBER_ID;
const phone = { width: 500, height: 1000, scale: 2, mobile: true };
const desktop = { width: 1280, height: 800, scale: 2, mobile: false };

const shots = [
  { name: "form-permisos-lifepoint", path: "/r/lifepoint", ...phone, scrollTo: "Tus permisos" },
  { name: "form-permisos-betel", path: "/r/betel", ...phone, scrollTo: "Tus permisos" },
  { name: "admin-miembros", path: "/admin/miembros", auth: true, ...desktop },
  { name: "admin-ajustes", path: "/admin/ajustes", auth: true, ...desktop },
  { name: "admin-editor", path: "/admin/ajustes", auth: true, ...desktop, height: 1150, scrollTo: "Color principal" },
  { name: "admin-qr", path: `/admin/miembros/${MEMBER_ID}`, auth: true, ...desktop, scrollTo: "Enlace personal: QR" },
];

const port = 9333;
const profile = mkdtempSync(join(tmpdir(), "ekk-chrome-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome no arranca");
}

const ws = new WebSocket(await target());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const myId = ++id;
    pending.set(myId, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");

async function go(path) {
  await send("Page.navigate", { url: BASE + path });
  await sleep(3500);
}

async function login() {
  await go("/login");
  await evaluate(`(() => {
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    set(document.querySelector('input[type="email"]'), "admin@lifepoint.example");
    set(document.querySelector('input[type="password"]'), "demo-ekklesias-2026");
    document.querySelector('button[type="submit"]').click();
  })()`);
  await sleep(15000);
  await sleep(1500);
  const where = await send("Runtime.evaluate", { expression: "location.pathname + ' | ' + document.body.innerText.slice(0, 160).split(String.fromCharCode(10)).join(' / ')", returnByValue: true });
  console.log("tras login:", where.result?.value ?? JSON.stringify(where));
  const cookies = await send("Network.getAllCookies");
  console.log("cookies:", cookies.cookies.map((c) => c.name).join(", "));
}

let logged = false;
for (const shot of shots) {
  if (shot.auth && !logged) {
    await login();
    logged = true;
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: shot.scale,
    mobile: shot.mobile,
  });
  await go(shot.path);
  if (shot.scrollTo) {
    await evaluate(`(() => {
      const el = [...document.querySelectorAll("h2,h3,legend,label")].find((x) => x.textContent.includes(${JSON.stringify(shot.scrollTo)}));
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 24, behavior: "instant" });
    })()`);
    await sleep(800);
  }
  const { data } = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(join(OUT, `${shot.name}.png`), Buffer.from(data, "base64"));
  console.log("captura", shot.name);
}

ws.close();
chrome.kill();
process.exit(0);
