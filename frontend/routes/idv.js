var axios = require('axios');
var crypto = require('crypto');
var { privPEM } = require('../key');
var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  if (req.session.idv) {
    res.render('individual', {
      identity: req.session.idv.name,
      title: 'Individual'
    });
  } else {
    res.redirect('/idv/login');
  }
});

router.get('/query', async function(req, res, next) {
  try {
    const userData = await axios.get('http://localhost:8080/userData', {
      params: req.session.idv
    });
    if (userData.data?.msg === 'Success' &&
      Array.isArray(userData.data?.data?.Injection)) {
      res.render('list', {
        data: userData.data.data.Injection,
        individual: true,
        name: req.session.idv.name,
        title: `Injection records of ${req.session.idv.name}`
      });
    } else {
      res.redirect(303, '/');
    }
  } catch (err) {
    next(err);
  }
});

router.get('/gen-qr', function(req, res) {
  if (req.session.idv) {
    res.render('qr', {
      qr: true,
      title: 'Your QR code'
    });
  } else {
    res.redirect('/idv/login');
  }
});

const key = crypto.scryptSync(
  process.env.TOKEN_PWD || 'Vaccine',
  process.env.TOKEN_SALT || 'Sugar',
  32
);

const signRSA = function(text) {
  const sign = crypto.createSign('SHA256');
  sign.update(text);
  sign.end();
  return sign.sign(privPEM);
};

router.put('/gen-qr', function(req, res) {
  if (req.session.idv) {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5);
    const payload = JSON.stringify({
      ...req.session.idv,
      expiry: expiry.toISOString()
    });
    const iv = crypto.randomBytes(16);
    const aes = crypto.createCipheriv('aes-256-cbc', key, iv);
    const token = Buffer.concat([
      aes.update(payload),
      aes.final()
    ]);
    const json = {
      expiry: expiry.toISOString(),
      name: req.session.idv.name,
      token: `${token.toString('hex')}|${iv.toString('hex')}`
    };
    res.send({
      ...json,
      signature: signRSA(JSON.stringify(json)).toString('base64')
    });
  } else {
    res.status(403).send({ error: 'unauthorized' });
  }
});

router.get('/login', function(req, res) {
  res.render('login', {
    identity: 'idv',
    title: 'Login as individual'
  });
});

router.post('/login', async function(req, res, next) {
  if (req.body.name && req.body.pid) {
    try {
      const auth = await axios.get('http://localhost:8080/loginUser', {
        params: {
          id: req.body.pid,
          name: req.body.name
        }
      });
      if (auth.data?.data === 'Failed') {
        res.redirect(303, '.');
      } else {
        req.session.idv = {
          id: req.body.pid,
          name: req.body.name
        };
        res.redirect(303, '/idv');
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.redirect(303, '.');
  }
});

module.exports = router;
