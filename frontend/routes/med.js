var axios = require('axios');
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
    if (auth.data?.hasPublicKey) {
      res.redirect('/med');
    } else {
      res.render('medInit', {
        challenge: auth.data?.challenge,
        fid: req.session.med.hospital_name,
        init: true,
        title: 'First Login'
      });
    }
  } else {
    res.redirect('/med/login');
  }
});

router.post('/init', async function(req, res) {
  if (req.session.med && req.body.chal && req.body.pub && req.body.sig) {
    try {
      const result = await axios.get('http://localhost:8080/setPubKey', {
        params: {
          challenge: req.body.chal,
          publicKey: req.body.pub,
          signature: req.body.sig
        }
      });
      res.send(result.data);
    } catch (err) {
      res.send({ data: 'Success' });
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
  ].every((key) => key in req.body)) {
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
        res.redirect(303, auth.data?.hasPublicKey ? '/med' : '/med/init');
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.redirect(303, '.');
  }
});

module.exports = router;
