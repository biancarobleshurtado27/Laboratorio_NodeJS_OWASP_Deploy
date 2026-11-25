const test = require('node:test');
const assert = require('node:assert/strict');
const { loginSchema, noteSchema } = require('../src/validators/schemas');

test('rejects a typical SQL injection payload in the login email', () => {
  const result = loginSchema.safeParse({
    email: "admin@umbrafiction.example' OR 1=1 --",
    password: 'anything'
  });
  assert.equal(result.success, false);
});

test('accepts SQL-like text in a note as inert user content', () => {
  const result = noteSchema.safeParse({
    title: 'Prueba de seguridad',
    content: "' OR 1=1 -- no ejecuta una consulta"
  });
  assert.equal(result.success, true);
});
