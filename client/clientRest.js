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

    registerUser(email, password) {
        $.ajax({
            type: 'POST',
            url: '/registerUser',
            data: JSON.stringify({ "email": email, "password": password }),
            success: function (data) {
                if (data.nick == -1) {
                    console.log("User " + data.nick + " has been registered");
                    $.cookie("nick", data.nick);
                    console.log("Welcome to the system" + data.nick)
                    //cw.mostrarLogin();
                }
                else {
                    console.log("That nickname is aleady in use");
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.log("Status: " + textStatus);
                console.log("Error: " + errorThrown);
            },
            contentType: 'application/json'
        });
    }
}

module.exports.clientRest = clientRest