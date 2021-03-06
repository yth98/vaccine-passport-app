const { ok } = require('assert');
var axios = require('axios');
var crypto = require('crypto');
var { key } = require('../key');
var express = require('express');
var router = express.Router();
var idvRouter = require('./idv');
var medRouter = require('./med');

router.get('/', function(req, res) {
  res.render('index', {
    index: true,
    title: 'Vaccination Authentication Service'
  });
});

router.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

router.post('/scan', async function(req, res) {
  try {
    const [
      token,
      iv
    ] = req.body.t.split('|').
      map((str, idx) => Buffer.from(str, idx ? 'hex' : 'base64'));
    const aes = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const payload = JSON.parse(`${aes.update(token)}${aes.final()}`);
    ok(new Date() < new Date(payload.expiry) && payload.id && payload.name);
    res.render('list', {
      data: (await axios.get('http://localhost:8080/userData', {
        params: {
          id: payload.id,
          name: payload.name
        }
      })).data.data.Injection,
      name: payload.name,
      title: `Injection records of ${payload.name}`
    });
  } catch (err) {
    res.status(403).send('Invalid or expired token.');
  }
});

module.exports = {
  idvRouter,
  indexRouter: router,
  medRouter
};
