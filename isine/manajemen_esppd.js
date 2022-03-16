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
    // console.log(req.files);
    cb(null, Date.now() + '-' + file.originalname)
  }
})

var upload = multer({ storage: storage })

//start-------------------------------------
router.get('/dashboard', cek_login, function (req, res) {
  res.render('content-backoffice/dashboard_sppd');
});
router.get('/', cek_login, function (req, res) {
  let q = "SELECT a.*,(SELECT s2.status FROM sppd s2 WHERE s2.id_surat_masuk = a.id ORDER BY s2.id desc limit 1)as status_surat, DATE_FORMAT(a.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(a.tgl_akhir, '%d-%m-%Y') as end, 'masuk' as jenis FROM surat_masuk a where a.deleted=0 order by a.id desc" ;
  if (req.user[0].role >= 3) {
    q = `SELECT DISTINCT a.*,s.status,(SELECT s2.status FROM sppd s2 WHERE s2.id_surat_masuk = a.id ORDER BY s2.id desc limit 1)as status_surat  , DATE_FORMAT(a.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(a.tgl_akhir, '%d-%m-%Y') as end, 'masuk' as jenis FROM surat_masuk a join sppd s on s.id_surat_masuk = a.id  join disposisi b on a.id = b.idSuratMasuk WHERE s.id_user = ${req.user[0].id_user} and a.deleted=0 and s.status = 0 order  by a.id desc`

  }
  connection.query(q, function (err, rows, fields) {
    console.log(rows);
    res.render('content-backoffice/e_sppd/list', { data: rows });
  });
});

router.get('/insert', cek_login, function (req, res) {
  res.render('content-backoffice/e_sppd/insert');
});

router.get('/edit/:id', cek_login, function (req, res) {
  connection.query(`SELECT a.*, b.perihal FROM sppd a join surat_masuk b on a.id_surat_masuk = b.id where a.id_surat_masuk=${req.params.id} and a.id_user=${req.user[0].id_user}`, function (err, rows, fields) {
    connection.query(`SELECT u.id_user as id_atasan,u.role, u.fullname,d.id_user,d.id_disposisi as id_pengirim  from surat_masuk sm join disposisi d on sm.id = d.idSuratMasuk JOIN user u on u.id_user = d.id_user  where sm.id = ${req.params.id}  ORDER by d.id DESC limit 1 `, function (err, rowss, fields) {
      connection.query(`SELECT * FROM user u WHERE role =3 and deleted =0`,function (err, rowsss, fields) {
        res.render('content-backoffice/e_sppd/edit', { data: rows, id: req.params.id, atasan: rowss ,sekertaris:rowsss,user:req.user[0]});
      })
    })
  });
});

router.post('/submit_insert', cek_login, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'fileLaporan', maxCount: 1 }]), function (req, res) {
  var post = {}
  post = req.body;
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

  }
  post['id_user'] = req.user[0].id_user
  sql_enak.insert(post).into("sppd").then(hasil => {
    sql_enak('surat_masuk').where('id', '=', id_surat_masuk).update({ statusLaporan: 1 })
  })
    .finally(function () {
      // sql_enak.destroy();
      res.redirect('/manajemen_esppd');
    });
});

router.post('/submit_edit', cek_login, upload.fields([
  { name: "fileLaporan", maxCount: 1 },
  { name: "file", maxCount: 1 },
]), function (req, res) {
  var post = {}
  post = req.body;
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

  }
  post['id_user'] = req.user[0].id_user
  sql_enak("sppd").where("id", req.body.id)
    .update(post).then(function (count) {
      res.redirect('/manajemen_esppd');
    })

});


router.get('/persetujuan_laporan', cek_login, async function (req, res) {
  // const data = await sql_enak.raw(`select *,DATE_FORMAT(sm.tgl_surat, '%d-%m-%Y') as tanggal,DATE_FORMAT(sm.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(sm.tgl_akhir, '%d-%m-%Y') as end from surat_masuk sm  join sppd s on sm.id = s.id_surat_masuk join master_jenis_surat mjs on mjs.id = sm.id_jenis_surat`)
  let q = "SELECT s.*,sm.*,DATE_FORMAT(sm.tgl_surat, '%d-%m-%Y') as tanggal,DATE_FORMAT(sm.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(sm.tgl_akhir, '%d-%m-%Y') as end, 'masuk' as jenis FROM surat_masuk sm join sppd s on sm.id = s.id_surat_masuk join master_jenis_surat mjs on mjs.id = sm.id_jenis_surat where sm.deleted=0 order by s.id desc";
  if (req.user[0].role >=3) {
  // q=`SELECT *,DATE_FORMAT(sm.tgl_surat, '%d-%m-%Y') as tanggal,DATE_FORMAT(sm.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(sm.tgl_akhir, '%d-%m-%Y') as end FROM sppd s join surat_masuk sm on sm.id = s.id_surat_masuk JOIN disposisi d on d.id_disposisi = s.id_user and sm.id =d.idSuratMasuk join master_jenis_surat mjs on mjs.id = sm.id_jenis_surat  WHERE s.id_user = ${req.user[0].id_user} and s.status >0`
  q=`SELECT  s.status as status_posisi_surat,s.posisi_surat  ,sm.id,(SELECT s2.status FROM sppd s2 WHERE s2.id_surat_masuk = sm.id ORDER BY s2.id desc limit 1)as status_surat ,sm.no_surat,sm.pengirim ,sm.perihal ,DATE_FORMAT(sm.tgl_surat, '%d-%m-%Y') as tanggal,DATE_FORMAT(sm.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(sm.tgl_akhir, '%d-%m-%Y') as end FROM surat_masuk sm join sppd s on s.id_surat_masuk = sm.id  WHERE  s.id_user =${req.user[0].id_user}  and s.status >0 and s.status !=4 order by s.id desc `
}
  connection.query(q, function (err, rows, fields) {

      res.render('content-backoffice/e_sppd/persetujuan_laporan', { data: rows, id: req.user[0].id_user,role:req.user[0].role});
  });
});
router.get(`/getDetailSurat/:id`,cek_login,async function (req,res) {
  connection.query(`SELECT sm.*,(SELECT s2.status FROM sppd s2 WHERE s2.id_surat_masuk = sm.id ORDER BY s2.id desc limit 1)as status_surat ,s.*,s.id as id_sppd,mjs.jenis_surat,DATE_FORMAT(sm.tgl_surat, '%d-%m-%Y') as tanggal,DATE_FORMAT(sm.tgl_mulai, '%d-%m-%Y') as start,DATE_FORMAT(sm.tgl_akhir, '%d-%m-%Y') as end from surat_masuk sm join master_jenis_surat mjs on sm.id_jenis_surat = mjs.id JOIN sppd s on s.id_surat_masuk = sm.id WHERE sm.id=  ${req.params.id} and s.id_user =${req.user[0].id_user} ORDER by s.id desc  `, function (err, rows, fields) {
    res.json({rows})
  })
})
router.get(`/atasan/:id`,cek_login,async function (req,res) {
  connection.query(`SELECT d.id_user,(SELECT u2.id_user  FROM user u2 WHERE role = 3 AND deleted = 0 limit 1)as id_sk ,u.fullname , u.role  from disposisi d join user u on u.id_user = d.id_user WHERE d.id_disposisi =${req.user[0].id_user} and d.idSuratMasuk =${req.params.id}`, function (err, rows, fields) {
    res.json({rows})
  })
})
router.get('/persetujuan/:id/:id_dituju', async function (req, res) {
  const { id, id_dituju } = req.params
  sql_enak("sppd")
    .where("id_surat_masuk", "=", id)
    .update({
      id_dituju: id_dituju,
    })
    .then(function (id) { });
  res.redirect('/manajemen_esppd/persetujuan_laporan');
})

router.post('/disposisi_laporan', cek_login, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'fileLaporan', maxCount: 1 }, { name: 'file_revisi', maxCount: 1 }]),
  async function (req, res) {

    const { id_surat_masuk, deskripsi, id_user, status, keterangan, penanggungJawabId, id_sppd ,file , file_revisi , fileLaporan } = req.body
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

// console.log(req.body,'body');
    await sql_enak.insert({ id_surat_masuk, deskripsi, id_user, status, keterangan, penanggungJawabId, file: post.file, fileLaporan: post.fileLaporan, file_revisi: post.file_revisi,posisi_surat:post.status}).into("sppd")
      .then(async hasil => {
         await sql_enak('sppd').where('id',id_sppd).update({ id_surat_masuk, deskripsi, keterangan, file: post.file, file_revisi: post.file_revisi , fileLaporan: post.fileLaporan, penanggungJawabId ,posisi_surat:post.status})
         let sekertaris=await sql_enak.raw(`select u.id_user from user u where u.role = 3 and u.deleted  =0 limit 1`)
         let kebad=await sql_enak.raw(`select u.id_user from user u where u.role = 2 and u.deleted  =0 limit 1`)
console.log(req.user[0].role,kebad[0][0].id_user,sekertaris[0][0].id_user,id_user);
         if( req.user[0].role==6 ){
          await sql_enak.insert({ id_surat_masuk, deskripsi, id_user:sekertaris[0][0].id_user, status:5, keterangan, penanggungJawabId, file: post.file, fileLaporan: post.fileLaporan, file_revisi: post.file_revisi,posisi_surat:5}).into("sppd")
         }else if (req.user[0].role==9&&id_user==kebad[0][0].id_user ) {
          await sql_enak.insert({ id_surat_masuk, deskripsi, id_user:sekertaris[0][0].id_user, status:5, keterangan, penanggungJawabId, file: post.file, fileLaporan: post.fileLaporan, file_revisi: post.file_revisi,posisi_surat:5}).into("sppd")
         }

      });
    res.redirect('/manajemen_esppd');
  })

router.post('/tindak_lanjut_laporan', cek_login, upload.fields([{ name: 'file_revisi', maxCount: 1 }]), async function (req, res) {
  const { laporan_id, id_surat_masuk, keterangan } = req.body
  await sql_enak.raw(`UPDATE sppd set status = 2 where id = ${laporan_id}`)

  let laporan = await sql_enak.raw(`SELECT * from sppd s where s.id_surat_masuk = ${id_surat_masuk} order by s.id limit 1`)
  await sql_enak.raw(`insert into sppd (id_surat_masuk,deskripsi,file,id_user,status,keterangan) VALUES ('${id_surat_masuk}','${laporan[0][0].deskripsi}','${laporan[0][0].file}','${laporan[0][0].id_user}','2','${keterangan}') `)


  res.redirect('/manajemen_esppd/persetujuan_laporan');
});

router.get('/history_laporan/:id_surat_masuk', cek_login, function (req, res) {
  const { id_surat_masuk } = req.params
  let q = "SELECT s.*,u.fullname as nama_mengetahui,u2.fullname as penganggung_jawab,u.`role` as role from sppd s join `user` u on s.id_user = u.id_user join `user` u2 on s.penanggungJawabId = u2.id_user  where s.id_surat_masuk = " + id_surat_masuk + ` ORDER by s.id `

  connection.query(q, function (err, rows, fields) {
    res.json(rows)
    // res.render('content-backoffice/e_sppd/list', { data: rows });
  });
});

module.exports = router;
