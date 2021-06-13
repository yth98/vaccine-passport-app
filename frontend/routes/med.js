var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  if (req.session.med) {
    res.render('medical', { title: 'Health facility' });
  } else {
    res.redirect(`${req.baseUrl}${req.path}login`);
  }
});

router.get('/create', function(req, res) {
  res.send('TODO');
});

router.get('/login', function(req, res) {
  res.render('login', {
    identity: 'med',
    title: 'Login as health facility'
  });
});

router.post('/login', function(req, res) {
  if (req.body.fid && req.body.pwd) {
    req.session.med = req.body.fid;
    res.redirect(303, `${req.baseUrl}`);
  } else {
    res.redirect(303, '.');
  }
});

module.exports = router;
