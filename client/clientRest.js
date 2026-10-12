class clientRest {

    addUser(nick) {
        var cli = this;
        $.getJSON("/addUser/" + nick, function (data) {
            if (data.nick == -1) {
                console.log("User " + nick + " has been registered");
                msg = "Welcome, " + nick;
                $.cookie("nick", nick);
            } else {
                console.log("User " + nick + " already exists");
            }
        });
    }

    listUsers() {
        var cli = this;
        $.getJSON("/listUsers", function (data) {
            console.log("Users: ", data);
        });
    }
    numberOfUsers() {
        var cli = this;
        $.getJSON("/numberOfUsers", function (data) {
            console.log("Number of users: ", data.length);
        });
    }
    removeUser(nick) {
        var cli = this;
        $.getJSON("/removeUser/" + nick, function (data) {
            if (data.nick != -1) {
                console.log("User " + nick + " has been removed");
                $.removeCookie("nick");
            } else {
                console.log("User " + nick + " does not exist");
            }
        });
    }
    userExists(nick) {
        var cli = this;
        $.getJSON("/userExists/" + nick, function (data) {
            console.log("User exists: ", data);
        });
    }
}

module.exports.clientRest = clientRest