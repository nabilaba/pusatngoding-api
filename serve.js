const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = low(adapter);

const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 8000;

const server = jsonServer.create();
const router = jsonServer.router("./db.json");
const userdb = JSON.parse(fs.readFileSync("./db.json", "UTF-8"));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = "123456789";

const expiresIn = "1h";

// Create a token from a payload
const createToken = (email, nama_depan) =>
  jwt.sign({ email, nama_depan }, SECRET_KEY, { expiresIn });

// Verify the token
const verifyToken = (token) =>
  jwt.verify(token, SECRET_KEY, (err, decode) =>
    decode !== undefined ? decode : err
  );

// Check if the user exists in database
const getUser = (email, password) =>
  userdb.mentor.find(
    (user) => user.email === email && user.password === password
  ) ||
  userdb.siswa.find(
    (user) => user.email === email && user.password === password
  ) ||
  userdb.admin.find(
    (user) => user.email === email && user.password === password
  );

const getUserbyEmail = (email) =>
  userdb.siswa.find((user) => user.email === email) ||
  userdb.mentor.find((user) => user.email === email) ||
  userdb.admin.find((user) => user.email === email);

const getCreatedAt = () => {
  var date = new Date();
  var tahun = date.getFullYear();
  var bulan = date.getMonth();
  var tanggal = date.getDate();
  var hari = date.getDay();
  var jam = date.getHours();
  var menit = date.getMinutes();
  var detik = date.getSeconds();
  switch (hari) {
    case 0:
      hari = "Minggu";
      break;
    case 1:
      hari = "Senin";
      break;
    case 2:
      hari = "Selasa";
      break;
    case 3:
      hari = "Rabu";
      break;
    case 4:
      hari = "Kamis";
      break;
    case 5:
      hari = "Jum'at";
      break;
    case 6:
      hari = "Sabtu";
      break;
  }
  switch (bulan) {
    case 0:
      bulan = "Januari";
      break;
    case 1:
      bulan = "Februari";
      break;
    case 2:
      bulan = "Maret";
      break;
    case 3:
      bulan = "April";
      break;
    case 4:
      bulan = "Mei";
      break;
    case 5:
      bulan = "Juni";
      break;
    case 6:
      bulan = "Juli";
      break;
    case 7:
      bulan = "Agustus";
      break;
    case 8:
      bulan = "September";
      break;
    case 9:
      bulan = "Oktober";
      break;
    case 10:
      bulan = "November";
      break;
    case 11:
      bulan = "Desember";
      break;
  }
  var tampilTanggal = `${hari}, ${tanggal} ${bulan} ${tahun}`;
  var tampilWaktu = `${jam}:${menit}:${detik}`;

  return `${tampilTanggal} ${tampilWaktu}`;
};

// Register New User
server.post("/register", (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);

  const { nama_depan, nama_belakang, email, no_telp, password, role } =
    req.body;
  let user = getUserbyEmail(email);

  if (user) {
    const status = 400;
    const message = "Email already exist";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile("./db.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get current users data
    data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = Date.now();

    //Add new user
    user = {
      ...req.body,
      id: last_item_id + 1,
      created_at: getCreatedAt(),
    };

    db.get(role).push(user).write();

    const tokenId = createToken(user.email, user.nama_depan);
    console.log("Access Token:" + tokenId);

    res.status(200).json({ tokenId, user: { ...user } });
  });
});

server.post("/tambah-kursus", (req, res) => {
  console.log("tambah-kursus endpoint called; request body:");
  console.log(req.body);

  let kursus = req.body;

  fs.readFile("./db.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get the id of last user
    var last_item_id = Date.now();

    //Add new user
    kursus = {
      ...req.body,
      id: last_item_id + 1,
      created_at: getCreatedAt(),
    };

    db.get("kursus").push(kursus).write();

    res.status(200).json({ kursus: { ...kursus } });
  });
});

server.post("/tambah-transaksi", (req, res) => {
  console.log("tambah-transaksi endpoint called; request body:");
  console.log(req.body);

  let transaksi = req.body;

  fs.readFile("./db.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get the id of last user
    var last_item_id = Date.now();

    //Add new user
    transaksi = {
      ...req.body,
      id: last_item_id + 1,
      created_at: getCreatedAt(),
    };

    db.get("transaksi").push(transaksi).write();

    res.status(200).json({ transaksi: { ...transaksi } });
  });
});

// Login to one of the users from ./users.json
server.post("/login", (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;

  const user = getUser(email, password);

  if (!user) {
    const status = 400;
    const message = "Incorrect email or password";
    res.status(status).json({ status, message });
    return;
  }

  const tokenId = createToken(user.email, user.nama_depan);
  console.log("Access Token:" + tokenId);

  res.status(200).json({ tokenId, user: { ...user } });
});

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (
    req.headers.authorization === undefined ||
    req.headers.authorization.split(" ")[0] !== "Bearer"
  ) {
    const status = 401;
    const message = "Error in authorization format";
    res.status(status).json({ status, message });
    return;
  }
  try {
    let verifyTokenResult;
    verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);

    if (verifyTokenResult instanceof Error) {
      const status = 401;
      const message = "Access token not provided";
      res.status(status).json({ status, message });
      return;
    }
    next();
  } catch (err) {
    const status = 401;
    const message = "Error access_token is revoked";
    res.status(status).json({ status, message });
  }
});

server.use(router);

server.listen(port);
