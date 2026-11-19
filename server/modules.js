const data = require("./data.js");

class System {
    users = [];
    cad;
    constructor() {
        this.users = [];
        this.cad = new data.CAD;
        this.cad.connect(function (db) {
            console.log("Conectado a Mongo Atlas");
        });
    }

    googleUser(usr, callback) {
        this.cad.findOrCreateUser(usr, function (obj) {
            callback(obj);
        });
    }

    addUser(nick) {
        let result = { "nick": -1 };
        if (this.userExists(nick)) {
            return console.log("This user already exists")
        } else {
            this.users.push(new User(nick));
            result.nick = nick;
        }
        return result;
    }
    listUsers() {
        return this.users;
    }
    numberOfUsers() {
        return this.users.length;
    }

    findUser(nick) {

        if (this.userExists(nick)) {
            for (let i = 0; i < this.users.length; i++) {
                if (this.users[i].nick == nick) {

                    return i;
                }
            }

        } else {
            console.log("This user does not exist")
        }
    }

    removeUser(nick) {
        let result = { "nick": -1 };
        if (this.userExists(nick)) {
            let index = this.users.indexOf(nick);
            this.users.splice(index, 1);
            result.nick = nick;
            console.log("User removed");
            return result;
        } else {
            return console.log("This user does not exist")
        }
    }

    userExists(nick) {


        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].nick == nick) {

                return true;
            }

        }
        return false;

    }

    registerUser(obj, callback) {
        let module = this;
        if (!obj.nick) {
            obj.nick = obj.email;
        }

        this.cad.searchUser(obj, function (usr) {
            if (!usr) {
                module.cad.insertUser(obj, function (res) {
                    callback(res);
                });
            }
            else {
                callback({ "email": -1 });
            }
        });
    }

}

class User {
    nick;
    constructor(nick) {
        this.nick = nick
    }

}


module.exports.System = System

