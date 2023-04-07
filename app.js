const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const databasePath = path.join(__dirname, "cricketMatchDetails.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register/", async (request, response) => {
  let { username, name, password, gender, location } = request.body;
  let hashedPassword = await bcrypt.hash(password, 10);
  let checkUsernameQuery = `SELECT * FROM user WHERE username = '${username}';`;
  let userNameCheck = await database.get(checkUsernameQuery);
  if (userNameCheck === undefined) {
    let createNewUserQuery = `INSERT INTO
            user (username,name,password,gender,location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      let newUserDetails = await database.run(createNewUserQuery);
      response.send("User created successfully");
      response.status(200);
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordHashed = bcrypt.compare(password, dbUser.password);
    if (isPasswordHashed === true) {
      response.send("Login success");
    } else {
      response.send("Invalid password");
      response.status(400);
    }
  }
});

app.put("/change-passowrd", async (req, res) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await database.get(checkUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      const lengthOfPw = newPassword.length;
      if (lengthOfPw < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptPassword = await bcrypt.hash(newPassword, 10);
        const updatePwQuery = `UPDATE user SET password = '${encryptPassword}' WHERE username = '${username}';`;
        await database.run(updatePwQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
