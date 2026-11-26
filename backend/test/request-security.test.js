const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedOrigin, restrictOrigin } = require('../src/middleware/request-security');

test('permits solicitudes same-origin o sin encabezado Origin', () => {
  assert.equal(isAllowedOrigin(undefined, 'http://localhost:3000'), true);
  assert.equal(isAllowedOrigin('http://localhost:3000', 'http://localhost:3000'), true);
});

test('bloquea solicitudes de un origen externo', () => {
  assert.equal(isAllowedOrigin('https://sitio-malicioso.example', 'http://localhost:3000'), false);
});

test('permite aliases locales solo cuando se habilita desarrollo', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:3000', 'http://localhost:3000', true), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:3000', 'http://localhost:3000', false), false);
});

test('resuelve el origen de Railway durante el primer despliegue', () => {
  const middleware = restrictOrigin((req) => `https://${req.get('host')}`);
  const headers = {};
  const req = { get: (name) => ({ origin: 'https://securevault.up.railway.app', host: 'securevault.up.railway.app' })[name] };
  const res = { set: (name, value) => { headers[name] = value; return res; }, status: () => res, type: () => res, send: () => { throw new Error('La solicitud no debió bloquearse'); } };
  let continued = false;
  middleware(req, res, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://securevault.up.railway.app');
});

test('permite navegacion de solo lectura con Origin nulo, pero no escrituras', () => {
  const middleware = restrictOrigin('https://securevault.up.railway.app');
  const req = { method: 'GET', get: () => 'null' };
  const res = { status: () => res, type: () => res, send: () => { throw new Error('La lectura no debió bloquearse'); } };
  let continued = false;
  middleware(req, res, () => { continued = true; });
  assert.equal(continued, true);

  const writeReq = { method: 'POST', get: () => 'null' };
  let status;
  const writeRes = { status: (code) => { status = code; return writeRes; }, type: () => writeRes, send: () => {} };
  middleware(writeReq, writeRes, () => { throw new Error('La escritura no debió continuar'); });
  assert.equal(status, 403);
});
