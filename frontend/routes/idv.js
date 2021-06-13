var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  if (req.session.idv) {
    res.render('individual', { title: 'Individual' });
  } else {
    res.redirect(`${req.baseUrl}${req.path}login`);
  }
});

router.get('/query', function(req, res) {
  res.send('TODO');
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

router.post('/login', function(req, res) {
  if (req.body.name && req.body.pid) {
    req.session.idv = req.body.pid;
    res.redirect(303, `${req.baseUrl}`);
  } else {
    res.redirect(303, '.');
  }
});

module.exports = router;
