const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 8000;

const server = jsonServer.create();
const router = jsonServer.router("./db.json");
const userdb = JSON.parse(fs.readFileSync("./db.json", "UTF-8"));
const uuidv4 = require("uuidv4");

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = "123456789";

const expiresIn = "1h";

// Create a token from a payload
const createToken = (email, name) =>
  jwt.sign({ email, name }, SECRET_KEY, { expiresIn });

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

// Register New User
server.post("/register", (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);

  const { email, password, name } = req.body;
  let user = getUser(email, password);

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

    //Add new user
    user = {
      id: uuidv4(),
      email: email,
      name: name,
      password: password,
    };

    data.users.push(user);

    fs.writeFile("./db.json", JSON.stringify(data), (err, result) => {
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });

    // Create token for new user
    const tokenId = createToken(email, name);

    res.status(200).json({
      tokenId,
      user: { id: user.id, name: user.name, email: user.email },
    });
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

  const tokenId = createToken(user.email, user.name);
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

server.use(middlewares);
server.use(router);

server.listen(port); 