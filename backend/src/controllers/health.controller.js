function health(_req, res) {
  return res.type('application/json').status(200).send({ status: 'ok' });
}
module.exports = { health };
