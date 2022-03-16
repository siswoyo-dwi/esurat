var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var axios = require('axios');
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
const nodemailer = require("nodemailer");
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
var urlagenda = 'http://survplus.id:8863'
function updateAgenda() {
  axios.get(urlagenda + '/update')
    .then(function (response) {
      // handle success
      // console.log(response);
    })
}
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: "noreply@survplus.id", pass: "Survplus132" },
});

function ngemail(tujuan, idSurat) {
  let html = "";
  connection.query("SELECT *, id as id_surat_masuk, DATE_FORMAT(tgl_surat,'%d %M %Y') tgl_surat2 from surat_masuk where id=" + idSurat, function (err, rows, fields) {
    html = `Anda telah mendapatkan disposisi baru perihal: ${rows[0].perihal}, Silahkan klik tautan berikut <a href="http://survplus.id:8858/manajemen_esurat/surat_keluar/">ini</a>`
    let email = {
      from: "suRvplus <noreply@survplus.id>",
      to: tujuan,
      subject: `Notifikasi`,
      html: html,
    };


    transporter.sendMail(email, function (err) {
      if (err) console.log(err);
    });
  })

};
//start-------------------------------------
// DASHBOARD
router.get('/dashboard', cek_login, function (req, res) {
  let q = " FROM surat_masuk a WHERE a.deleted=0;";
  if (req.user[0].role == 3) {
    q = ` FROM surat_masuk a join disposisi b on a.id = b.idSuratMasuk WHERE (b.id_disposisi = ${req.user[0].id_user} or b.id_user = ${req.user[0].id_user}) and a.deleted=0`

  }
  // console.log("SELECT COUNT(a.id) AS jml "+q);
  connection.query("SELECT COUNT(a.id) AS jml " + q, function (err, rows, fields) {
    connection.query("SELECT COUNT(id) AS jml FROM surat_keluar WHERE deleted=0;", function (err, rowss, fields) {
      connection.query('SELECT count(a.id) as jml, b.id FROM `surat_masuk` a left join disposisi b on a.id=b.idSuratMasuk WHERE a.deleted =0 and b.id is null', function (err, jmlBlm, fields) {

        connection.query("SELECT id, DATE_FORMAT(tgl_mulai, '%Y-%m-%d') as start,DATE_FORMAT(DATE_ADD(tgl_akhir, INTERVAL 1 DAY), '%Y-%m-%d') as end, 'masuk' as jenis, (select a.username from user a join disposisi b on a.id_user = b.id_user where b.idSuratMasuk = c.id ORDER by b.id limit 1) as title FROM surat_masuk c WHERE deleted=0 having title is not null and start <> '0000-00-00';", function (err, eventnya, fields) {
          connection.query("SELECT id, DATE_FORMAT(tgl_mulai, '%Y-%m-%d') as start,DATE_FORMAT(DATE_ADD(tgl_akhir, INTERVAL 1 DAY), '%Y-%m-%d') as end, 'keluar' as jenis, b.username as title  FROM surat_keluar a join user b on a.penanggung_jawab= b.id_user  WHERE a.deleted=0 ", function (err, eventakhir, fields) {
            let event = eventnya.concat(eventakhir);
            res.render('content-backoffice/dashboard_surat', { surat_masuk: rows, surat_keluar: rowss, user: req.user[0], event, jmlBlm });
            // res.json({ surat_masuk: rows, surat_keluar: rowss })
          });
          // res.json({ surat_masuk: rows, surat_keluar: rowss })
        });
      });
    })
  });
});
router.get('/getsuratmasuk/:id', cek_login, function (req, res) {
  connection.query("SELECT a.*, DATE_FORMAT(a.tgl_surat,'%d-%m-%Y') as tgl_surat2, DATE_FORMAT(a.tgl_mulai,'%d-%m-%Y') as tgl_mulainya, DATE_FORMAT(a.tgl_akhir,'%d-%m-%Y') as tgl_akhirnya, b.jenis_surat FROM `surat_masuk` a LEFT JOIN master_jenis_surat b on a.id_jenis_surat = b.id WHERE a.id=" + req.params.id, function (err, rows, fields) {
    res.json({ data: rows[0] })
  });
});
router.get('/getsuratkeluar/:id', cek_login, function (req, res) {
  connection.query("SELECT a.*, b.fullname, DATE_FORMAT(a.tgl_surat,'%d-%m-%Y') as tgl_surat2, DATE_FORMAT(a.tgl_mulai,'%d-%m-%Y') as tgl_mulainya, DATE_FORMAT(a.tgl_akhir,'%d-%m-%Y') as tgl_akhirnya From surat_keluar a JOIN user b on a.penanggung_jawab = b.id_user where id=" + req.params.id, function (err, rows, fields) {
    res.json({ data: rows[0] })
  });
});
router.get('/list_suratmasuk', cek_login, function (req, res) {
  connection.query("SELECT *, DATE_FORMAT(tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(tgl_akhir, '%d-%m-%Y') as end, 'masuk' as jenis, (select a.username from user a join disposisi b on a.id_user = b.id_user where b.idSuratMasuk = c.id ORDER by b.id limit 1) as disposisi FROM surat_masuk c WHERE deleted=0", function (err, rows, fields) {
    res.json({ data: rows })
  });
});
// MASTER JENIS SURAT
router.get('/master_jenis_surat', cek_login, function (req, res) {
  connection.query("SELECT * from master_jenis_surat where deleted=0", function (err, rows, fields) {
    res.render('content-backoffice/e_surat/manajemen_jenis_surat/list', { data: rows });
  });
});


router.get('/master_jenis_surat/insert', cek_login, function (req, res) {
  res.render('content-backoffice/e_surat/manajemen_jenis_surat/insert');
});

router.get('/master_jenis_surat/edit/:id', cek_login, function (req, res) {
  connection.query("SELECT * from master_jenis_surat where id='" + req.params.id + "'", function (err, rows, fields) {
    res.render('content-backoffice/e_surat/manajemen_jenis_surat/edit', { data: rows });
  });
});

router.post('/master_jenis_surat/submit_insert', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  // console.log(post)
  sql_enak.insert(post).into("master_jenis_surat").then(function (id) {
    // console.log(id);
  })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/manajemen_esurat/master_jenis_surat');
    });
});

router.post('/master_jenis_surat/submit_edit', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  // console.log(post)

  sql_enak("master_jenis_surat").where("id", req.body.id)
    .update(post).then(function (count) {
      // console.log(count);
    })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/manajemen_esurat/master_jenis_surat');
    });
});

router.get('/master_jenis_surat/delete/:id', cek_login, function (req, res) {

  // senjata
  // console.log(req.params.id)
  connection.query("update master_jenis_surat SET deleted=1 WHERE id='" + req.params.id + "' ", function (err, rows, fields) {
    //  if (err) throw err;
    numRows = rows.affectedRows;
  })

  res.redirect('/manajemen_esurat/master_jenis_surat');
});

// SURAT MASUK
router.get('/get_surat_masuk/:id', cek_login, function (req, res) {
  connection.query("SELECT  a.*,b.jenis_surat, DATE_FORMAT(a.tgl_surat,'%d-%m-%Y') as tgl_surat2, DATE_FORMAT(a.tgl_mulai,'%d-%m-%Y') as tgl_mulai2, DATE_FORMAT(a.tgl_akhir,'%d-%m-%Y') as tgl_akhir2 from surat_masuk a JOIN master_jenis_surat b on a.id_jenis_surat = b.id where a.id='" + req.params.id + "'", function (err, rows, fields) {

    res.json({ data: rows });
  });
});

router.get('/surat_masuk', cek_login, function (req, res) {
  let q = `SELECT *,(SELECT COUNT(*) FROM disposisi d WHERE d.id_user  = ${req.user[0].id_user} AND d.idSuratMasuk = surat_masuk.id) as status_disposisi,(SELECT COUNT(*) from sppd s WHERE s.id_surat_masuk = surat_masuk.id) as status_laporan, id as id_surat_masuk, DATE_FORMAT(tgl_surat,'%d %M %Y') tgl_surat2 from surat_masuk where deleted=0 order by surat_masuk.id desc`;
  if (req.user[0].role >= 3) {
    q = `SELECT *,(SELECT COUNT(*) FROM disposisi d WHERE d.id_user  = ${req.user[0].id_user} AND d.idSuratMasuk = a.id) as status_disposisi, a.id as id_surat_masuk,DATE_FORMAT(a.tgl_surat,'%d %M %Y') tgl_surat2 ,(SELECT COUNT(*) from sppd s WHERE s.id_surat_masuk = a.id) as status_laporan FROM surat_masuk a join disposisi b on a.id = b.idSuratMasuk WHERE b.id_disposisi = ${req.user[0].id_user} and a.deleted=0 order by a.id desc`

  }
  connection.query(q, function (err, rows, fields) {
    // connection.query("SELECT * from user where role=3 and deleted=0", function (err, rowss, fields) {
    res.render('content-backoffice/e_surat/manajemen_surat_masuk/list', { data: rows, user: req.user[0] });
    // });
  });
});

router.get('/surat_masuk/insert', cek_login, function (req, res) {
  connection.query("SELECT * from master_jenis_surat where deleted=0", function (err, rows, fields) {
    res.render('content-backoffice/e_surat/manajemen_surat_masuk/insert', { jenis_surat: rows });
  });
});

router.get('/surat_masuk/edit/:id', cek_login, function (req, res) {
  connection.query("SELECT *, DATE_FORMAT(tgl_surat,'%Y-%m-%d') as tgl_surat2, DATE_FORMAT(tgl_mulai,'%Y-%m-%d') as tgl_mulai2, DATE_FORMAT(tgl_akhir,'%Y-%m-%d') as tgl_akhir2 from surat_masuk where id='" + req.params.id + "'", function (err, rows, fields) {
    connection.query("SELECT * from master_jenis_surat where deleted=0", function (err, rowss, fields) {

      res.render('content-backoffice/e_surat/manajemen_surat_masuk/edit', { data: rows, jenis_surat: rowss });
    });
  });
});

router.post('/surat_masuk/submit_insert', cek_login, upload.fields([{ name: 'file_surat', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['file_surat']) {
      var nama_file = req.files['file_surat'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['file_surat'] = nama_file;
    }



  }
  sql_enak.insert(post).into("surat_masuk").then(function (id) {
  })
    .finally(function () {
      //sql_enak.destroy();
      updateAgenda()
      res.redirect('/manajemen_esurat/surat_masuk');
    });
});

router.post('/surat_masuk/submit_edit', cek_login, upload.fields([{ name: 'file_surat', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['file_surat']) {
      var nama_file = req.files['file_surat'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['file_surat'] = nama_file;
    }


  }
  sql_enak("surat_masuk").where("id", req.body.id)
    .update(post).then(function (count) {
    })
    .finally(function () {
      //sql_enak.destroy();
      updateAgenda()
      res.redirect('/manajemen_esurat/surat_masuk');
    });
});
// router.get(`/get/desposisi/:id_surat_masuk`,cek_login,function (req,res) {
//   console.log('hai');
//   connection.query(`SELECT COUNT(*)  FROM disposisi d WHERE idSuratMasuk = ${req.params.id_surat_masuk} and d.id_user = ${req.user[0].id_user}`,function (req,res) {
//     console.log(rows ,'rows');
//     res.json(rows)
//   })
// })
router.post('/disposisi/submit_insert', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  post['id_user'] = req.user[0].id_user;
  sql_enak.insert(post).into("disposisi").then(function (id) {
  })
    .finally(function () {
      //sql_enak.destroy();
      // res.redirect('/manajemen_esurat/surat_masuk');
      //  if (err) throw err;
      connection.query(`select * from user where id_user=${post['id_disposisi']}`, function (err, rows, fields) {

        ngemail(rows[0].email, post['idSuratMasuk'])
      })

      updateAgenda()
      res.json({ status: 'berhasil' })
    });
});
router.get('/json_disposisi/:id_surat', cek_login, function (req, res) {

  // senjata
  connection.query(`select *, (select fullname from user where id_user=a.id_disposisi) as disposisi,(select fullname from user where id_user=a.id_user) as dari, DATE_FORMAT(jam, "%d-%m-%Y %H:%i") as waktu from disposisi a WHERE idSuratMasuk=` + req.params.id_surat, function (err, rows, fields) {
    //  if (err) throw err;
    res.json({ data: rows });
  })


});

router.get('/hapus_disposisi/:id', cek_login, function (req, res) {

  // senjata
  connection.query(`DELETE FROM disposisi where id=` + req.params.id, function (err, rows, fields) {
    //  if (err) throw err;
    updateAgenda()
    res.json({ data: rows });
  })


});
router.get('/surat_masuk/delete/:id', cek_login, function (req, res) {

  // senjata
  connection.query("update surat_masuk SET deleted=1 WHERE id='" + req.params.id + "' ", function (err, rows, fields) {
    //  if (err) throw err;
    updateAgenda()
    numRows = rows.affectedRows;
  })

  res.redirect('/manajemen_esurat/surat_masuk');
});


// SURAT KELUAR
router.get('/get_surat_keluar/:id', cek_login, function (req, res) {
  connection.query("SELECT a.*, b.fullname, DATE_FORMAT(a.tgl_surat,'%d-%m-%Y') as tgl_surat2, DATE_FORMAT(a.tgl_mulai,'%d-%m-%Y') as tgl_mulai2, DATE_FORMAT(a.tgl_akhir,'%d-%m-%Y') as tgl_akhir2 from surat_keluar a JOIN user b on a.penanggung_jawab=b.id_user where a.id='" + req.params.id + "'", function (err, rows, fields) {

    res.json({ data: rows });
  });
});

router.get('/surat_keluar', cek_login, function (req, res) {
  let t = ""
  if (req.user[0].role > 2) {
    t += " and a.penanggung_jawab = " + req.user[0].id_user
  }
  connection.query("SELECT a.*, b.fullname, DATE_FORMAT(a.tgl_surat,'%d %M %Y') tgl_surat2 FROM `surat_keluar` a join user b on a.penanggung_jawab = b.id_user where a.deleted=0" + t, function (err, rows, fields) {
    res.render('content-backoffice/e_surat/manajemen_surat_keluar/list', { data: rows, user: req.user[0] });
  });
});

router.get('/surat_keluar/insert', cek_login, function (req, res) {
  connection.query("SELECT * from user where deleted=0", function (err, rows, fields) {
    res.render('content-backoffice/e_surat/manajemen_surat_keluar/insert', { user: rows });
  });
});

router.get('/surat_keluar/edit/:id', cek_login, function (req, res) {
  connection.query("SELECT *, DATE_FORMAT(tgl_surat,'%Y-%m-%d') as tgl_surat2, DATE_FORMAT(tgl_mulai,'%Y-%m-%d') as tgl_mulai2 , DATE_FORMAT(tgl_akhir,'%Y-%m-%d') as tgl_akhir2 from surat_keluar where id='" + req.params.id + "'", function (err, rows, fields) {
    connection.query("SELECT * from user where deleted=0", function (err, rowss, fields) {

      res.render('content-backoffice/e_surat/manajemen_surat_keluar/edit', { data: rows, user: rowss });
    });
  });
});

router.post('/surat_keluar/submit_insert', cek_login, upload.fields([{ name: 'file_surat', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['file_surat']) {
      var nama_file = req.files['file_surat'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['file_surat'] = nama_file;
    }



  }
  sql_enak.insert(post).into("surat_keluar").then(function (id) {
    // console.log(id);
  })
    .finally(function () {
      //sql_enak.destroy();
      updateAgenda()
      res.redirect('/manajemen_esurat/surat_keluar');
    });
});

router.post('/surat_keluar/submit_edit', cek_login, upload.fields([{ name: 'file_surat', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
  if (req.files) {
    if (req.files['file_surat']) {
      var nama_file = req.files['file_surat'][0].filename;
      // nama_file = nama_file.slice(0, -4)
      post['file_surat'] = nama_file;
    }


  }
  sql_enak("surat_keluar").where("id", req.body.id)
    .update(post).then(function (count) {
    })
    .finally(function () {
      //sql_enak.destroy();
      updateAgenda()
      res.redirect('/manajemen_esurat/surat_keluar');
    });
});

router.get('/surat_keluar/delete/:id', cek_login, function (req, res) {

  // senjata
  // console.log(req.params.id)
  connection.query("update surat_keluar SET deleted=1 WHERE id='" + req.params.id + "' ", function (err, rows, fields) {
    //  if (err) throw err;
    updateAgenda()
    numRows = rows.affectedRows;
  })

  res.redirect('/manajemen_esurat/surat_keluar');
});
module.exports = router;
