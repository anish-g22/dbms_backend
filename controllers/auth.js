const pool = require("../util/connectionPool");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const tok_decode = require("jwt-decode");

exports.postLogin = (req, res, next) => {
  console.log(req.headers);
  const user_id = req.body.username;
  const user_pass = req.body.password;
  const user_role = req.body.role;

  pool
    .execute("SELECT * FROM USERS WHERE USER_ID = ? AND USER_ROLE = ?", [
      user_id,
      user_role,
    ])
    .then(([rows, fields]) => {
      if (!rows.length) {
        return console.log("User Not Found!!");
      }

      bcrypt
        .compare(user_pass, rows[0].USER_PASS)
        .then((result) => {
          console.log(result);
          if (result) {
            let token = "invalid";
            token = jwt.sign(
              { user_id: user_id, user_role: user_role },
              process.env.TOKEN_SECRET,
              {
                algorithm: "HS256",
                expiresIn: 2 * 60 * 60,
              }
            );
            res.status(200).send({ token: token });
          } else {
            return res.status(401).send("Invalid Password");
          }
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
  // res.json({ token: "authenticated" });
};

exports.postSignup = (req, res, next) => {
  console.log("postSignup");

  const cname = req.body.companyName;
  const cprofile = req.body.profile;
  const city = req.body.city;
  const username = req.body.username;
  const password = req.body.password;

  const query = `INSERT INTO COMPANY (CNAME, Cprofile, City, Cstatus, Pass, CregDate)
  VALUES (?, ?, ?, 'pending', ?, NOW())`;

  pool
   .execute(query, [cname, cprofile, city, password])
   .then(([rows, fields]) => {
      console.log(rows);
      res.status(200).send({ status: "Registered Successfully" });
    })
   .catch((err) => console.log(err));
}

exports.is_auth = (req, res, next) => {
  let tok = "";
  let valid = false;
  if (
    req.headers.authorization != "" &&
    req.headers.authorization != undefined
  ) {
    tok = req.headers.authorization.split(" ")[1];
    if (tok != " " && tok != null) {
      console.log("tok: ", tok);
      jwt.verify(tok, process.env.TOKEN_SECRET, (err, result) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log("Token verified: \n", result);
        const temp = tok_decode.jwtDecode(tok);
        req.body = {...req.body, ...temp};
        next();
      });
    } else return res.status(200).send({ status: "Unauthorized" });
  }
};

exports.is_student = (req, res, next) => {
  console.log("check", req.body);

  if (req.body.user_role != "student") {
    return res
      .status(200)
      .send({ role: req.body.user_role, status: "invalid" });
  }
  next();
};

exports.is_company = (req, res, next) => {
  console.log("check company", req.body);

  if (req.body.user_role != "company") {
    return res
      .status(200)
      .send({ role: req.body.user_role, status: "invalid" });
  }
  next();
};

exports.is_admin = (req, res, next) => {
  console.log("check", req.body);

  if (req.body.user_role != "admin") {
    return res
      .status(200)
      .send({ role: req.body.user_role, status: "invalid" });
  }
  next();
};

exports.updatePass = (req, res, next) => {
  var Row = [];
  pool
    .execute("SELECT aid user_id, PASS FROM ADMINISTRATOR")
    .then(([rows, field]) => {
      console.log(rows);
      rows.forEach((element) => {
        console.log(element, "\n");
        bcrypt
          .hash(element.PASS, 11)
          .then((res) => {
            console.log(element, " ", res);
            return pool.execute("INSERT INTO USERS VALUES (?, ?, ?)", [
              element.user_id,
              res,
              "admin",
            ]);
          })
          .then((res) => console.log(res, " Inserted successfully"))
          .catch((err) => console.log(err));
      });
    })
    .catch((err) => console.log(err));
  // for (let index = 0; index < Row.length; index++) {
  //   const element = array[index];

  // }
  res.redirect("/");
};
