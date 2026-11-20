import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIpFromHeader } from "./client-ip.ts";

test("un proxy de confianza: se usa la última entrada, no la que escribe el cliente", () => {
  assert.equal(clientIpFromHeader("6.6.6.6, 203.0.113.9", 1), "203.0.113.9");
});
test("el cliente no puede falsear su IP añadiendo entradas a la izquierda", () => {
  assert.equal(clientIpFromHeader("1.1.1.1, 2.2.2.2, 203.0.113.9", 1), "203.0.113.9");
});
test("dos proxies de confianza: se salta el último", () => {
  assert.equal(clientIpFromHeader("203.0.113.5, 10.0.0.2", 2), "203.0.113.5");
});
test("una sola entrada", () => {
  assert.equal(clientIpFromHeader("203.0.113.9", 1), "203.0.113.9");
});
test("menos entradas que proxies: se usa la primera", () => {
  assert.equal(clientIpFromHeader("203.0.113.9", 3), "203.0.113.9");
});
test("sin cabecera -> unknown", () => {
  assert.equal(clientIpFromHeader(null, 1), "unknown");
  assert.equal(clientIpFromHeader("", 1), "unknown");
});
test("con 0 proxies se ignora la cabecera", () => {
  assert.equal(clientIpFromHeader("6.6.6.6", 0), "direct");
});
