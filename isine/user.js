var connection = require('../database').connection;
var express = require('express');
var router = express.Router();
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , static = require('serve-static')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , path = require('path')
  , sha1 = require('sha1');
var sql_enak = require('../database/mysql_enak.js').connection;

var cek_login = require('./login').cek_login;
var dbgeo = require("dbgeo");
var multer = require("multer");

path.join(__dirname, '/foto')
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.use(cookieParser());
router.use(session({ secret: 'bhagasitukeren', cookie: { maxAge: 1200000 }, saveUninitialized: true, resave: true }));
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
    cb(null, 'foto/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

var upload = multer({ storage: storage })

//start-------------------------------------
router.get('/', cek_login, function (req, res) {
  let a = "";
  if (req.user[0].role != 0) {
    a += " and id_user=" + req.user[0].id_user;
  }
  connection.query("SELECT * from user where deleted=0 " + a, function (err, rows, fields) {
    if (err) throw err;
    numRows = rows.length;
    console.log(rows);
    res.render('content-backoffice/user/manajemen_user/list', { data: rows, user: req.user[0] });
  })

});
router.get('/get_user_disposisi', cek_login, function (req, res) {
  let role = '> ' + req.user[0].role;
  if (req.user[0].role == 1) {
    role = ' = 2';
  } else if (req.user[0].role == 2) {
    role = ' IN (9,3,6)';
  } else if (req.user[0].role == 3) {
    role = ' IN (6,9,4)';
  } else if (req.user[0].role == 4) {
    role = ' IN (5)';
  } else if (req.user[0].role == 5) {
    role = ' > 100';
  } else if (req.user[0].role == 6) {
    role = ' IN (7,9)';
  } else if (req.user[0].role == 7) {
    role = ' IN (8)';
  } else if (req.user[0].role == 9) {
    role = ' > 100';
  }

  connection.query("SELECT * from user where deleted=0 and role " + role, function (err, rows, fields) {
    res.json(rows)
  })
});

router.get('/get_user_disposisi_laporan', cek_login, function (req, res) {
  let role = '> ' + req.user[0].role;
  if (req.user[0].role == 3) {
    role = ' = 2';
  }
  else if (req.user[0].role == 4) {
    role = ' = 3';
  }
  else if (req.user[0].role == 5) {
    role = ' = 4';
  }
  else if (req.user[0].role == 6) {
    role = ' = 2';
  }
  else if (req.user[0].role == 7) {
    role = ' = 6';
  }
  else if (req.user[0].role == 8) {
    role = ' = 7';
  }
  else if (req.user[0].role == 9) {
    role = ' =3';
  }

  connection.query("SELECT * from user where deleted=0 and role " + role, function (err, rows, fields) {
    res.json({ data: rows })
  })
});



router.get('/getrole', cek_login, function (req, res) {
  res.json({ user: req.user[0] })

});
router.get('/sekertaris', cek_login, function (req, res) {
  connection.query(`SELECT * FROM user WHERE role = 3 and deleted =0`, function (req, res) {
    res.json(req)
  })
});
router.get('/insert', cek_login, function (req, res) {
  connection.query("SELECT * from master_golongan where deleted=0", function (err, data_golongan, fields) {
    connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, data_unit_kerja, fields) {
      connection.query("SELECT * from master_jabatan where deleted=0", function (err, data_jabatan, fields) {
        res.render('content-backoffice/user/manajemen_user/insert', { golongan: data_golongan, unit_kerja: data_unit_kerja, jabatan: data_jabatan });
      });
    });
  });
});

router.get('/edit/:id', cek_login, function (req, res) {
  connection.query("select *, DATE_FORMAT(tgl_lahir,'%Y-%m-%d') as tgl_lahir2 from user where id_user='" + req.params.id + "'", function (err, rows, fields) {
    connection.query("SELECT * from master_golongan where deleted=0", function (err, data_golongan, fields) {
      connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, data_unit_kerja, fields) {
        connection.query("SELECT * from master_jabatan where deleted=0", function (err, data_jabatan, fields) {
          if (err) throw err;
          res.render('content-backoffice/user/manajemen_user/edit', { data: rows, golongan: data_golongan, unit_kerja: data_unit_kerja, jabatan: data_jabatan, user: req.user[0] });
        })
      });
    });
  });
});

router.get('/edit_password/:id', cek_login, function (req, res) {
  connection.query("select *, DATE_FORMAT(tgl_lahir,'%Y-%m-%d') as tgl_lahir2 from user where id_user='" + req.params.id + "'", function (err, rows, fields) {
    res.render('content-backoffice/user/manajemen_user/edit_password', { data: rows });
  });
});



router.get('/delete/:id', cek_login, function (req, res) {

  // senjata
  // console.log(req.params.id)
  connection.query("update user SET deleted=1 WHERE id_user='" + req.params.id + "' ", function (err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
  })
  res.redirect('/user');
});



router.post('/submit_insert', upload.array(), function (req, res) {

  // baca name-namenya dari form
  // req.body.nameopo

  // senjata
  console.log(req.body)
  let post = req.body
  post.pwd = sha1(req.body.pwd)
  sql_enak.insert(post).into("user").then(function (id) {
    sql_enak.insert({ id_user: id }).into("pegawai").then(function (idx) {
      console.log(idx);
      res.redirect('/user');
    })
    console.log(id);
  })
  // connection.query("insert into user (username, pwd, fullname, jns_kelamin, tgl_lahir, tempat_lahir, alamat, id_golongan, id_unit_kerja, id_jabatan, NIP, email, telp, golongan_darah, agama, no_npwp, tmt_gaji_berkala, pendidikan_terakhir, is_admin, role) VALUES ('" + req.body.username + "', '" + sha1(req.body.pwd) + "', '" + req.body.fullname + "', '" + req.body.jns_kelamin + "', '" + req.body.tgl_lahir + "', '" + req.body.tempat_lahir + "',  '" + req.body.alamat + "','" + req.body.id_golongan + "','" + req.body.id_unit_kerja + "','" + req.body.id_jabatan + "','" + req.body.NIP + "', '" + req.body.email + "', '" + req.body.telp + "', '" + req.body.golongan_darah + "', '" + req.body.agama + "','" + req.body.no_npwp + "','" + req.body.tmt_gaji_berkala + "', '" + req.body.pendidikan_terakhir + "', '" + req.body.is_admin + "', '" + req.body.role + "')", function (err, rows, fields) {
  //   if (err) throw err;
  //   numRows = rows.affectedRows;
  // })

})

router.post('/submit_edit', upload.array(), function (req, res) {

  // baca name-namenya dari form
  // req.body.nameopo

  // senjata
  //console.log(req.body)
  connection.query("update user SET username='" + req.body.username + "', fullname='" + req.body.fullname + "', jns_kelamin='" + req.body.jns_kelamin + "', tgl_lahir='" + req.body.tgl_lahir + "', tempat_lahir='" + req.body.tempat_lahir + "', alamat='" + req.body.alamat + "', id_golongan='" + req.body.id_golongan + "', id_unit_kerja='" + req.body.id_unit_kerja + "', id_jabatan='" + req.body.id_jabatan + "', NIP='" + req.body.NIP + "', email='" + req.body.email + "', telp='" + req.body.telp + "',golongan_darah='" + req.body.golongan_darah + "', agama='" + req.body.agama + "', no_npwp='" + req.body.no_npwp + "', tmt_gaji_berkala='" + req.body.tmt_gaji_berkala + "', pendidikan_terakhir='" + req.body.pendidikan_terakhir + "', is_admin='" + req.body.is_admin + "', role='" + req.body.role + "' WHERE id_user='" + req.body.id_user + "' ", function (err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
  })
  res.redirect('/user/edit/' + req.body.id_user);
})

router.post('/submit_edit_password', function (req, res) {

  // baca name-namenya dari form
  // req.body.nameopo

  // senjata
  //console.log(req.body)
  connection.query("update user SET  pwd='" + sha1(req.body.pwd) + "'  WHERE id_user='" + req.body.id_user + "' ", function (err, rows, fields) {
    if (err) throw err;
    numRows = rows.affectedRows;
  })
  res.redirect('/user');
})

// MASTER UNIT KERJA
router.get('/master_unit_kerja', cek_login, function (req, res) {
  connection.query("SELECT * from master_unit_kerja where deleted=0", function (err, rows, fields) {
    res.render('content-backoffice/user/manajemen_unit_kerja/list', { data: rows });
  });
});


router.get('/master_unit_kerja/insert', cek_login, function (req, res) {
  res.render('content-backoffice/user/manajemen_unit_kerja/insert');
});

router.get('/master_unit_kerja/edit/:id', cek_login, function (req, res) {
  connection.query("SELECT * from master_unit_kerja where id='" + req.params.id + "'", function (err, rows, fields) {
    res.render('content-backoffice/user/manajemen_unit_kerja/edit', { data: rows });
  });
});

router.post('/master_unit_kerja/submit_insert', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  console.log(post)
  sql_enak.insert(post).into("master_unit_kerja").then(function (id) {
    console.log(id);
  })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/user/master_unit_kerja');
    });
});

router.post('/master_unit_kerja/submit_edit', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  console.log(post)

  sql_enak("master_unit_kerja").where("id", req.body.id)
    .update(post).then(function (count) {
      console.log(count);
    })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/user/master_unit_kerja');
    });
});

router.get('/master_unit_kerja/delete/:id', cek_login, function (req, res) {

  // senjata
  // console.log(req.params.id)
  connection.query("update master_unit_kerja SET deleted=1 WHERE id='" + req.params.id + "' ", function (err, rows, fields) {
    //  if (err) throw err;
    numRows = rows.affectedRows;
  })

  res.redirect('/user/master_unit_kerja');
});


// MASTER JABATAN
router.get('/master_jabatan', cek_login, function (req, res) {
  connection.query("SELECT * from master_jabatan where deleted=0", function (err, rows, fields) {
    res.render('content-backoffice/user/manajemen_jabatan/list', { data: rows });
  });
});

router.get('/master_jabatan/insert', cek_login, function (req, res) {
  res.render('content-backoffice/user/manajemen_jabatan/insert');
});

router.get('/master_jabatan/edit/:id', cek_login, function (req, res) {
  connection.query("SELECT * from master_jabatan where id='" + req.params.id + "'", function (err, rows, fields) {
    res.render('content-backoffice/user/manajemen_jabatan/edit', { data: rows });
  });
});

router.post('/master_jabatan/submit_insert', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  console.log(post)
  sql_enak.insert(post).into("master_jabatan").then(function (id) {
    console.log(id);
  })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/user/master_jabatan');
    });
});

router.post('/master_jabatan/submit_edit', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  console.log(post)

  sql_enak("master_jabatan").where("id", req.body.id)
    .update(post).then(function (count) {
      console.log(count);
    })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/user/master_jabatan');
    });
});

router.get('/master_jabatan/delete/:id', cek_login, function (req, res) {

  // senjata
  // console.log(req.params.id)
  connection.query("update master_jabatan SET deleted=1 WHERE id='" + req.params.id + "' ", function (err, rows, fields) {
    //  if (err) throw err;
    numRows = rows.affectedRows;
  })

  res.redirect('/user/master_jabatan');
});

// MASTER GOLONGAN
router.get('/master_golongan', cek_login, function (req, res) {
  connection.query("SELECT * from master_golongan where deleted=0", function (err, rows, fields) {
    res.render('content-backoffice/user/manajemen_golongan/list', { data: rows });
  });
});

router.get('/master_golongan/insert', cek_login, function (req, res) {
  res.render('content-backoffice/user/manajemen_golongan/insert');
});

router.get('/master_golongan/edit/:id', cek_login, function (req, res) {
  connection.query("SELECT * from master_golongan where id='" + req.params.id + "'", function (err, rows, fields) {
    res.render('content-backoffice/user/manajemen_golongan/edit', { data: rows });
  });
});

router.post('/master_golongan/submit_insert', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  console.log(post)
  sql_enak.insert(post).into("master_golongan").then(function (id) {
    console.log(id);
  })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/user/master_golongan');
    });
});

router.post('/master_golongan/submit_edit', cek_login, function (req, res) {
  var post = {}
  post = req.body;

  console.log(post)

  sql_enak("master_golongan").where("id", req.body.id)
    .update(post).then(function (count) {
      console.log(count);
    })
    .finally(function () {
      //sql_enak.destroy();
      res.redirect('/user/master_golongan');
    });
});

router.get('/master_golongan/delete/:id', cek_login, function (req, res) {

  // senjata
  // console.log(req.params.id)
  connection.query("update master_golongan SET deleted=1 WHERE id='" + req.params.id + "' ", function (err, rows, fields) {
    //  if (err) throw err;
    numRows = rows.affectedRows;
  })

  res.redirect('/user/master_golongan');
});


module.exports = router;
