const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedOrigin } = require('../src/middleware/request-security');

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
