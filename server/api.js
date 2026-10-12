const fs = require("fs");
const passport = require('passport');
const cookieSession = require('cookie-session');
require('./server/passport-setup.js');
const express = require('express');
const app = express();
const rest = require("./modules.js");

const PORT = process.env.PORT || 3000;

app.use(cookieSession({
    name: 'System',
    keys: ['key1', 'key2']
}));
app.use(passport.initialize());
app.use(passport.session());
app.get("/auth/google", passport.authenticate('google', {
    scope: ['profile', 'email']
}));
app.use(express.static(__dirname + "/"));

let system = new rest.System();

app.get("/", function (request, response) {
    var content = fs.readFileSync("./client/index.html");
    response.setHeader("Content-type", "text/html");
    response.send(content);
});
app.get("/addUser/:nick", function (request, response) {
    let nick = request.params.nick;
    let res = system.addUser(nick);
    response.send(res);
});
app.get("/listUsers", function (request, response) {
    let res = system.listUsers();
    response.send(res);
});
app.get("/userExists/:nick", function (request, response) {
    let nick = request.params.nick;
    let res = system.userExists(nick);
    response.send(res);
});
app.get("/numberOfUsers", function (request, response) {
    let res = system.numberOfUsers();
    response.send(res);
});
app.get("/removeUser/:nick", function (request, response) {
    let nick = request.params.nick;
    let res = system.removeUser(nick);
    response.send(res);
});
app.listen(PORT, () => {
    console.log(`App is listening on port ${PORT}`);
    console.log('Ctrl+C to exit');
});