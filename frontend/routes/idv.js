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
    res.redirect(`${req.baseUrl}${req.path}login`);
  }
});

router.get('/query', async function(req, res, next) {
  try {
    const userData = await axios.get('http://localhost:8080/userData', {
      params: req.session.idv
    });
    if (Array.isArray(userData.data)) {
      res.render('list', {
        data: userData.data,
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
  res.send('TODO');
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
      if (auth.data === 'Failed') {
        res.redirect(303, '.');
      } else {
        req.session.idv = {
          id: req.body.pid,
          name: req.body.name
        };
        res.redirect(303, `${req.baseUrl}`);
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.redirect(303, '.');
  }
});

module.exports = router;
