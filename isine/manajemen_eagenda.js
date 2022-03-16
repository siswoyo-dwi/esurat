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
  connection.query("SELECT id, DATE_FORMAT(tgl_mulai, '%Y-%m-%d') as start,DATE_FORMAT(DATE_ADD(tgl_akhir, INTERVAL 1 DAY), '%Y-%m-%d') as end, 'masuk' as jenis, perihal as title FROM surat_masuk c WHERE deleted=0 and tgl_mulai <> '0000-00-00';", function (err, eventnya, fields) {
    connection.query("SELECT id, 'purple' as color, DATE_FORMAT(tgl_mulai, '%Y-%m-%d') as start,DATE_FORMAT(DATE_ADD(tgl_akhir, INTERVAL 1 DAY), '%Y-%m-%d') as end, 'keluar' as jenis, a.perihal as title  FROM surat_keluar a  WHERE a.deleted=0 ", function (err, eventakhir, fields) {
      let event = eventnya.concat(eventakhir);
      res.render('content-backoffice/dashboard_agenda', {  user: req.user[0], event});
      // res.json({ surat_masuk: rows, surat_keluar: rowss })
    });
    // res.json({ surat_masuk: rows, surat_keluar: rowss })
  });
});

module.exports = router;
