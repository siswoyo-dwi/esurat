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
router.get('/surat_masuk', cek_login, function (req, res) {
  connection.query("SELECT a.*, DATE_FORMAT(tgl_mulai,'%d-%m-%Y') tgl_mulai2, DATE_FORMAT(tgl_surat,'%d-%m-%Y') tgl_surat2 from surat_masuk a where a.deleted=0 and (select count(x.id) from disposisi x left join user z on x.id_disposisi= z.id_user where x.idSuratMasuk = a.id and z.role=2) >0 and (select count(x.id) from disposisi x left join user z on x.id_user= z.id_user where x.idSuratMasuk = a.id and z.role=2) =0 order by a.id desc", function (err, rows, fields) {
    connection.query("SELECT * from user where role=3 and deleted=0", function (err, rowss, fields) {
      connection.query(`SELECT a.*, DATE_FORMAT(tgl_mulai,'%d-%m-%Y') tgl_mulai2, DATE_FORMAT(tgl_surat,'%d-%m-%Y') tgl_surat2 from surat_masuk a where a.deleted=0 and (select count(x.id) from disposisi x left join user z on x.id_user= z.id_user where x.idSuratMasuk = a.id and z.role=2) >0  order by a.id desc`
        , function (err, lewat, fields) {
          res.render('content-backoffice/manajemen_kadin/surat_masuk', { data: rows, disposisi: rowss, user: req.user[0], lewat });
        });
    });
  });
});

router.get('/surat_keluar', cek_login, function (req, res) {
  connection.query("SELECT a.*, b.fullname, DATE_FORMAT(a.tgl_surat,'%d-%m-%Y') tgl_surat2 FROM `surat_keluar` a join user b on a.penanggung_jawab = b.id_user where a.deleted=0", function (err, rows, fields) {
    res.render('content-backoffice/manajemen_kadin/surat_keluar', { data: rows, user: req.user[0] });
  });
});

router.get('/kinerja', cek_login, function (req, res) {
  // res.render('content-backoffice/manajemen_kadin/kinerja', { user: req.user[0] });

  connection.query(`select count(*) as y, fullname as label from user a join sppd b on a.id_user = b.id_user GROUP by a.id_user`, function (err, rows, fields) {
    res.render('content-backoffice/manajemen_kadin/kinerja', { user: req.user[0], data: rows });  // res.json({ data: rows })
  });
});

router.get('/persetujuan_laporan', cek_login, function (req, res) {
  let q =`SELECT *,(SELECT s2.status FROM sppd s2 WHERE s2.id_surat_masuk = sm.id  and s2.status !=5 ORDER BY s2.id desc limit 1)as status_surat ,s.id as id_esppd,u.fullname  ,DATE_FORMAT(sm.tgl_surat, '%d-%m-%Y') as tanggal,DATE_FORMAT(sm.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(sm.tgl_akhir, '%d-%m-%Y') as end, 'masuk' as jenis FROM sppd s join user u on u.id_user = s.id_user  join surat_masuk sm on s.id_surat_masuk  = sm.id join master_jenis_surat mjs on mjs.id = sm.id_jenis_surat WHERE s.id_user   = ${req.user[0].id_user}  and sm.deleted=0 order by s.id desc`
  connection.query(q, function (err, rows, fields) {
    res.render('content-backoffice/manajemen_kadin/persetujuan_laporan', { user: req.user[0],data:rows });  // res.json({ data: rows })
  });
});

router.post('/disposisi_laporan', cek_login, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'fileLaporan', maxCount: 1 }, { name: 'file_revisi', maxCount: 1 }]),
  async function (req, res) {
    // console.log(  req.files['file'][0].filename,req.files['fileLaporan'][0].filename  );
    const { id_surat_masuk, deskripsi, id_user, status, keterangan,diketahui, penanggungJawabId, id_sppd ,file , file_revisi , fileLaporan ,keteranganUntukPenanggungJawab} = req.body
    const post = req.body

    if (req.files) {
      if (req.files['file']) {
        var nama_file = req.files['file'][0].filename;
        // nama_file = nama_file.slice(0, -4)
        post['file'] = nama_file;
      }
      if (req.files['fileLaporan']) {
        var nama_file = req.files['fileLaporan'][0].filename;
        // nama_file = nama_file.slice(0, -4)
        post['fileLaporan'] = nama_file;
      }
      if (req.files['file_revisi']) {
        var nama_file = req.files['file_revisi'][0].filename;
        // nama_file = nama_file.slice(0, -4)
        post['file_revisi'] = nama_file;
      }

    }

    console.log(req.body, 'body');
    console.log(post, 'post');
    console.log(file, 'file');


    await sql_enak.insert({ id_surat_masuk, deskripsi, id_user, status,diketahui:1, keterangan, penanggungJawabId, file: post.file, fileLaporan: post.fileLaporan, file_revisi: post.file_revisi }).into("sppd")
      .then(async hasil => {
         await sql_enak('sppd').where('id',id_sppd).update({ id_surat_masuk, deskripsi,diketahui:1, keterangan:keteranganUntukPenanggungJawab, file: post.file, file_revisi: post.file_revisi , fileLaporan: post.fileLaporan, penanggungJawabId })
      })
      console.log("test drive")

    res.redirect('/manajemen_esppd');
  })

module.exports = router;
