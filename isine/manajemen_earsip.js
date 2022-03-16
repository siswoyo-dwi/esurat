var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , path = require('path')
  , sha1 = require('sha1');
var sql_enak = require('../database/mysql_enak.js').connection;
var cek_login = require('./login').cek_login;
var cek_login_google = require('./login').cek_login_google;
var dbgeo = require("dbgeo");
var multer = require("multer");
var st = require('knex-postgis')(sql_enak);
var deasync = require('deasync');
path.join(__dirname, '/public/foto')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(cookieParser());
router.use(passport.initialize());
router.use(passport.session());
router.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/foto/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

var upload = multer({ storage: storage })

//start-------------------------------------
router.get('/dashboard', cek_login, function (req, res) {
  res.render('content-backoffice/dashboard_arsip');
});

router.get('/arsip_aktif', cek_login, function (req, res) {
  connection.query("SELECT a.*, DATE_FORMAT(a.masa_berlaku,'%Y-%m-%d') as masa_berlaku2, b.unit_kerja from arsip_aktif a LEFT JOIN master_unit_kerja b on a.bidang = b.id where a.deleted=0 and a.status=0", function (err, rows, fields) {
    res.render('content-backoffice/e_arsip/manajemen_arsip_aktif/list', { data: rows });
  });
});

router.get('/arsip_aktif/insert', cek_login, function (req, res) {
  connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, data_unit_kerja, fields) {
    res.render('content-backoffice/e_arsip/manajemen_arsip_aktif/insert', { unit_kerja: data_unit_kerja });
  });
});

router.get('/arsip_aktif/edit/:id', cek_login, function (req, res) {
  connection.query("select *, DATE_FORMAT(masa_berlaku,'%Y-%m-%d') as masa_berlaku2 from arsip_aktif where id='" + req.params.id + "'", function (err, rows, fields) {
    connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, data_unit_kerja, fields) {
      res.render('content-backoffice/e_arsip/manajemen_arsip_aktif/edit', { data: rows, unit_kerja: data_unit_kerja });
    });
  });
});


router.post('/arsip_aktif/submit_insert', cek_login, upload.fields([{ name: 'file', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['file']) {
      var nama_file = req.files['file'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['file'] = nama_file;
    }



  }
  console.log(post)
  sql_enak.insert(post).into("arsip_aktif").then(function (id) {
    console.log(id);
  })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/manajemen_earsip/arsip_aktif');
    });
});

router.post('/arsip_aktif/submit_edit', cek_login, upload.fields([{ name: 'file', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['file']) {
      var nama_file = req.files['file'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['file'] = nama_file;
    }


  }
  console.log(post)
  sql_enak("arsip_aktif").where("id", req.body.id)
    .update(post).then(function (count) {
      console.log(count);
    })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/manajemen_earsip/arsip_aktif');
    });
});

router.get('/arsip_aktif/delete/:id', cek_login, function (req, res) {

  // senjata
  // console.log(req.params.id)
  connection.query("update arsip_aktif SET deleted=1 WHERE id='" + req.params.id + "' ", function (err, rows, fields) {
    //  if (err) throw err;
    numRows = rows.affectedRows;
  })

  res.redirect('/manajemen_earsip/arsip_aktif');
});

router.get('/arsip_inaktif', cek_login, function (req, res) {
  connection.query("SELECT a.*, DATE_FORMAT(a.masa_berlaku,'%Y-%m-%d') as masa_berlaku2, b.unit_kerja from arsip_aktif a LEFT JOIN master_unit_kerja b on a.bidang = b.id where a.deleted=0 and a.status=1", function (err, rows, fields) {
    res.render('content-backoffice/e_arsip/manajemen_arsip_inaktif/list', { data: rows });
  });
});

router.get('/arsip_inaktif/edit/:id', cek_login, function (req, res) {
  connection.query("select *, DATE_FORMAT(masa_berlaku,'%Y-%m-%d') as masa_berlaku2 from arsip_aktif where id='" + req.params.id + "'", function (err, rows, fields) {
    connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, data_unit_kerja, fields) {
      res.render('content-backoffice/e_arsip/manajemen_arsip_inaktif/edit', { data: rows, unit_kerja: data_unit_kerja });
    });
  });
});

router.post('/arsip_inaktif/submit_edit', cek_login, upload.fields([{ name: 'file', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['file']) {
      var nama_file = req.files['file'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['file'] = nama_file;
    }


  }
  console.log(post)
  sql_enak("arsip_aktif").where("id", req.body.id)
    .update(post).then(function (count) {
      console.log(count);
    })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/manajemen_earsip/arsip_inaktif');
    });
});
module.exports = router;
