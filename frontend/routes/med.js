const { ok } = require('assert');
var axios = require('axios');
var crypto = require('crypto');
var { key } = require('../key');
var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  if (req.session.med) {
    res.render('medical', {
      identity: req.session.med.hospital_name,
      title: 'Health facility'
    });
  } else {
    res.redirect('/med/login');
  }
});

router.get('/init', async function(req, res) {
  if (req.session.med) {
    const auth = await axios.get('http://localhost:8080/loginHospital', {
      params: req.session.med
    });
    if (auth.data?.data === 'Success') {
      res.redirect('/med');
    } else {
      const iv = crypto.randomBytes(16);
      const aes = crypto.createCipheriv('aes-256-cbc', key, iv);
      const challenge = Buffer.concat([
        aes.update(JSON.stringify({ ch: req.session.med.hospital_name })),
        aes.final()
      ]);
      res.render('medInit', {
        challenge: `${challenge.toString('base64')}|${iv.toString('base64')}`,
        fid: req.session.med.hospital_name,
        init: true,
        title: 'First Login'
      });
    }
  } else {
    res.redirect('/med/login');
  }
});

const verifyRSA = function(text, publicKey, signature) {
  const pubPEM = `-----BEGIN PUBLIC KEY-----
${publicKey}
-----END PUBLIC KEY-----`;
  const verify = crypto.createVerify('SHA256');
  verify.update(text);
  verify.end();
  return verify.verify(pubPEM, signature);
};

const decChal = function(challenge, fid) {
  const [
    chal,
    iv
  ] = challenge.split('|').map((str) => Buffer.from(str, 'base64'));
  const aes = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const payload = JSON.parse(`${aes.update(chal)}${aes.final()}`);
  return payload.ch === fid;
};

router.post('/init', async function(req, res) {
  if (req.session.med && req.body.chal && req.body.pub && req.body.sig) {
    if (verifyRSA(
      req.body.chal,
      req.body.pub,
      Buffer.from(req.body.sig, 'base64')
    )) {
      try {
        ok(decChal(req.body.chal, req.session.med.hospital_name));
        const result = await axios.post('http://localhost:8080/setPublicKey', {
          ...req.session.med,
          'public_key': req.body.pub
        });
        res.send(result.data);
      } catch (err) {
        res.status(403).send();
      }
    } else {
      res.status(403).send();
    }
  } else {
    res.status(403).send();
  }
});

router.get('/create', function(req, res) {
  if (req.session.med) {
    res.render('add', {
      create: true,
      fid: req.session.med.hospital_name,
      title: 'Create Injection Record'
    });
  } else {
    res.redirect('/med/login');
  }
});

router.post('/create', async function(req, res, next) {
  if (req.session.med && [
    'usr_name',
    'id',
    'vaccine_name',
    'date',
    'doctor_name',
    'duration',
    'count'
  ].every((JSONkey) => JSONkey in req.body)) {
    try {
      const action = await axios.get('http://localhost:8080/addEntry', {
        params: {
          ...req.body,
          'hospital_name': req.session.med.hospital_name
        }
      });
      if (action.data?.data === 'Failed') {
        res.send('<script>history.back();</script>');
      } else {
        res.redirect(303, '/med');
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.redirect(303, '/med/create');
  }
});

router.get('/login', function(req, res) {
  res.render('login', {
    identity: 'med',
    title: 'Login as health facility'
  });
});

router.post('/login', async function(req, res, next) {
  if (req.body.fid && req.body.pwd) {
    try {
      const auth = await axios.get('http://localhost:8080/loginHospital', {
        params: {
          'hospital_name': req.body.fid,
          pwd: req.body.pwd
        }
      });
      if (auth.data?.data === 'Failed') {
        res.redirect(303, '.');
      } else {
        req.session.med = {
          'hospital_name': req.body.fid,
          pwd: req.body.pwd
        };
        res.redirect(303, auth.data?.data === 'Success' ? '/med' : '/med/init');
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.redirect(303, '.');
  }
});

module.exports = router;
