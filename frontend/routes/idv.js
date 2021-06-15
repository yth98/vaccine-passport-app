var axios = require('axios');
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
        title: `Injection records of <strong>${req.session.idv.name}</strong>`
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

router.put('/gen-qr', function(req, res) {
  if (req.session.idv) {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 5);
    const payload = JSON.stringify({
      ...req.session.idv,
      expiry: expiry.toISOString()
    });
    res.send({
      expiry: expiry.toISOString(),
      name: req.session.idv.name,
      token: 'TODO'
    });
  } else {
    res.status(403).send({
      error: 'unauthorized'
    });
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
