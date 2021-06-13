var express = require('express');
var router = express.Router();
var idvRouter = require('./idv');
var medRouter = require('./med');

router.get('/', function(req, res) {
  res.render('index', { title: 'Vaccination Authentication Service' });
});

router.get('/logout', function(req, res) {
  req.session.destroy();
  res.redirect('/');
});

module.exports = {
  idvRouter,
  indexRouter: router,
  medRouter
};
