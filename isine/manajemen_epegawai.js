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
  res.render('content-backoffice/dashboard_pegawai');
});

router.get('/tmt_gaji_berlaka', cek_login, function (req, res) {
  connection.query("SELECT u.id_user ,u.fullname ,u.NIP,muk.unit_kerja ,mj.jabatan ,mg.golongan ,DATEDIFF('2022-2-24',u.tmt_gaji_berkala) as tmt  from `user` u left join master_unit_kerja muk on u.id_unit_kerja = muk.id left join master_jabatan mj on u.id_jabatan = mj.id left join master_golongan mg on u.id_golongan = mg.id where u.id_user > 9 and u.deleted =0", function (err, rows, fields) {
    console.log(rows);
    res.render('content-backoffice/e_pegawai/manajemen_pegawai/tmt_gaji_berkala', { data: rows });
  });

});

router.get('/pegawai', cek_login, function (req, res) {

  connection.query("SELECT a.*, b.unit_kerja, c.jabatan, d.golongan FROM `user` a LEFT JOIN master_unit_kerja b on a.id_unit_kerja = b.id LEFT JOIN master_jabatan c on a.id_jabatan = c.id LEFT JOIN master_golongan d on a.id_golongan = d.id WHERE a.deleted = 0 and a.id_user=" + req.user[0].id_user, function (err, rows, fields) {
    connection.query("SELECT * from pegawai  ", function (err, data_pegawai, fields) {
      res.render('content-backoffice/e_pegawai/manajemen_pegawai/list', { data: rows, pegawai: data_pegawai });
      // res.json({ data: rows })
    });
  });
});


router.get('/kinerja', cek_login, function (req, res) {

  connection.query(`select count(*) as y, fullname as label from user a join sppd b on a.id_user = b.id_user GROUP by a.id_user`, function (err, rows, fields) {
    res.render('content-backoffice/e_pegawai/manajemen_pegawai/kinerja', { data: rows });  // res.json({ data: rows })
  });

});

router.get('/data_tmt_gaji_berkala', cek_login, function (req, res) {

  connection.query("SELECT u.id_user ,u.fullname ,u.NIP,muk.unit_kerja ,mj.jabatan ,mg.golongan ,DATEDIFF('2022-2-24',u.tmt_gaji_berkala) as tmt  from `user` u left join master_unit_kerja muk on u.id_unit_kerja = muk.id left join master_jabatan mj on u.id_jabatan = mj.id left join master_golongan mg on u.id_golongan = mg.id where u.id_user > 9 and u.deleted =0", function (err, rows, fields) {
    console.log(rows);
    res.render('content-backoffice/e_pegawai/manajemen_pegawai/tmt_gaji_berlaka', { data: rows });  // res.json({ data: rows })
  });

});

router.get('/pegawai/insert/:id', cek_login, function (req, res) {
  connection.query("SELECT a.*, DATE_FORMAT(a.tgl_lahir,'%Y-%m-%d') as tgl_lahir2, b.unit_kerja, c.jabatan, d.golongan FROM `user` a left join master_unit_kerja b on a.id_unit_kerja = b.id left join master_jabatan c on a.id_jabatan = c.id left join master_golongan d on a.id_golongan = d.id WHERE a.deleted = 0 and a.id_user='" + req.params.id + "'", function (err, rows, fields) {
    connection.query("SELECT * from master_golongan where deleted=0", function (err, data_golongan, fields) {
      connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, data_unit_kerja, fields) {
        connection.query("SELECT * from master_jabatan where deleted=0", function (err, data_jabatan, fields) {
          connection.query("SELECT * from pegawai  where id_user='" + req.params.id + "'", function (err, data_dokumen, fields) {

            res.render('content-backoffice/e_pegawai/manajemen_pegawai/insert', { data: rows, golongan: data_golongan, unit_kerja: data_unit_kerja, jabatan: data_jabatan, dokumen: data_dokumen });
            // res.json({ data: rows })

          });
        });
      });
    });
  });
});

// router.get('/pegawai/edit/:id', cek_login, function (req, res) {
//   connection.query("SELECT a.*, DATE_FORMAT(a.tgl_lahir,'%Y-%m-%d') as tgl_lahir2, b.unit_kerja, c.jabatan, d.golongan FROM `user` a join master_unit_kerja b on a.id_unit_kerja = b.id JOIN master_jabatan c on a.id_jabatan = c.id JOIN master_golongan d on a.id_golongan = d.id WHERE a.deleted = 0 and a.id_user='" + req.params.id + "'", function (err, rows, fields) {
//     connection.query("SELECT * from master_golongan where deleted=0", function (err, data_golongan, fields) {
//       connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, data_unit_kerja, fields) {
//         connection.query("SELECT * from master_jabatan where deleted=0", function (err, data_jabatan, fields) {
//           connection.query("SELECT * from pegawai  where id_user='" + req.params.id + "'", function (err, data_dokumen, fields) {
//             res.render('content-backoffice/e_pegawai/manajemen_pegawai/edit', { data: rows, golongan: data_golongan, unit_kerja: data_unit_kerja, jabatan: data_jabatan, dokumen: data_dokumen });
//             // res.json({ data: rows })
//           });
//         });
//       });
//     });
//   });
// });

router.get('/pegawai/edit/:id', cek_login, function (req, res) {
  connection.query("SELECT a.*, b.*, a.id_user FROM pegawai a join user b on a.id_user = b.id_user where a.id_user='" + req.params.id + "'", function (err, rows, fields) {
    res.render('content-backoffice/e_pegawai/manajemen_pegawai/edit', { data: rows });
    // res.json({ data: rows })
  });
});

router.get('/pegawai/dokumen/:id', cek_login, function (req, res) {
  connection.query("SELECT * from pegawai  where id_user='" + req.params.id + "'", function (err, data_dokumen, fields) {
    res.render('content-backoffice/e_pegawai/manajemen_pegawai/dokumen', { dokumen: data_dokumen });
    // res.json({ dokumen: data_dokumen })
  });
});

router.post('/pegawai/submit_insert', cek_login, upload.fields([{ name: 'sk_pns', maxCount: 1 }, { name: 'spmt', maxCount: 1 }, { name: 'skp', maxCount: 1 }, { name: 'ktp', maxCount: 1 }, { name: 'kk', maxCount: 1 }, { name: 'akta', maxCount: 1 }, { name: 'ijazah', maxCount: 1 }, { name: 'kgb', maxCount: 1 }, { name: 'karis_karsu', maxCount: 1 }, { name: 'taspen', maxCount: 1 }, { name: 'karpeg', maxCount: 1 }, { name: 'akses', maxCount: 1 }, { name: 'sertifikat', maxCount: 1 }, { name: 'sttp', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['sk_pns']) {
      var nama_file = req.files['sk_pns'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['sk_pns'] = nama_file;
    }

    if (req.files['spmt']) {
      var nama_file = req.files['spmt'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['spmt'] = nama_file;
    }

    if (req.files['skp']) {
      var nama_file = req.files['skp'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['skp'] = nama_file;
    }

    if (req.files['ktp']) {
      var nama_file = req.files['ktp'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['ktp'] = nama_file;
    }

    if (req.files['kk']) {
      var nama_file = req.files['kk'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['kk'] = nama_file;
    }

    if (req.files['akta']) {
      var nama_file = req.files['akta'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['akta'] = nama_file;
    }

    if (req.files['ijazah']) {
      var nama_file = req.files['ijazah'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['ijazah'] = nama_file;
    }

    if (req.files['kgb']) {
      var nama_file = req.files['kgb'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['kgb'] = nama_file;
    }

    if (req.files['karis_karsu']) {
      var nama_file = req.files['karis_karsu'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['karis_karsu'] = nama_file;
    }

    if (req.files['taspen']) {
      var nama_file = req.files['taspen'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['taspen'] = nama_file;
    }

    if (req.files['karpeg']) {
      var nama_file = req.files['karpeg'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['karpeg'] = nama_file;
    }

    if (req.files['akses']) {
      var nama_file = req.files['akses'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['akses'] = nama_file;
    }

    if (req.files['sertifikat']) {
      var nama_file = req.files['sertifikat'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['sertifikat'] = nama_file;
    }

    if (req.files['sttp']) {
      var nama_file = req.files['sttp'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['sttp'] = nama_file;
    }



  }

  console.log(post)
  sql_enak.insert(post).into("pegawai").then(function (id) {
    console.log(id);
  })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/manajemen_epegawai/pegawai');
    });
});


router.post('/pegawai/submit_edit', cek_login, upload.fields([{ name: 'sk_pns', maxCount: 1 }, { name: 'spmt', maxCount: 1 }, { name: 'skp', maxCount: 1 }, { name: 'ktp', maxCount: 1 }, { name: 'kk', maxCount: 1 }, { name: 'akta', maxCount: 1 }, { name: 'ijazah', maxCount: 1 }, { name: 'kgb', maxCount: 1 }, { name: 'karis_karsu', maxCount: 1 }, { name: 'taspen', maxCount: 1 }, { name: 'karpeg', maxCount: 1 }, { name: 'akses', maxCount: 1 }, { name: 'sertifikat', maxCount: 1 }, { name: 'sttp', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['sk_pns']) {
      var nama_file = req.files['sk_pns'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['sk_pns'] = nama_file;
    }

    if (req.files['spmt']) {
      var nama_file = req.files['spmt'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['spmt'] = nama_file;
    }

    if (req.files['skp']) {
      var nama_file = req.files['skp'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['skp'] = nama_file;
    }

    if (req.files['ktp']) {
      var nama_file = req.files['ktp'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['ktp'] = nama_file;
    }

    if (req.files['kk']) {
      var nama_file = req.files['kk'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['kk'] = nama_file;
    }

    if (req.files['akta']) {
      var nama_file = req.files['akta'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['akta'] = nama_file;
    }

    if (req.files['ijazah']) {
      var nama_file = req.files['ijazah'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['ijazah'] = nama_file;
    }

    if (req.files['kgb']) {
      var nama_file = req.files['kgb'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['kgb'] = nama_file;
    }

    if (req.files['karis_karsu']) {
      var nama_file = req.files['karis_karsu'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['karis_karsu'] = nama_file;
    }

    if (req.files['taspen']) {
      var nama_file = req.files['taspen'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['taspen'] = nama_file;
    }

    if (req.files['karpeg']) {
      var nama_file = req.files['karpeg'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['karpeg'] = nama_file;
    }

    if (req.files['akses']) {
      var nama_file = req.files['akses'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['akses'] = nama_file;
    }

    if (req.files['sertifikat']) {
      var nama_file = req.files['sertifikat'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['sertifikat'] = nama_file;
    }

    if (req.files['sttp']) {
      var nama_file = req.files['sttp'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['sttp'] = nama_file;
    }



  }
  console.log(post)
  sql_enak("pegawai").where("id_user", req.body.id_user)
    .update(post).then(function (count) {
      console.log(count);
    })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/manajemen_epegawai/pegawai');
    });
});
module.exports = router;
