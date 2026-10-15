class webControl {

    showAddUser() {
        $("#au").append(string);
        $("#submitBtn").on("click", function () {
            let name = $("#usr").val();
            rest.addUser(name);
            $("#mau").remove();
        });
        $('#mau').remove();
        let string = '<div id="mau">';
        string = string + '<div class="card"><div class="card-body">';
        string = string + '<div class="form-group">';
        string = string + '<label for="nick">Nick:</label>';
        string = string + '<p><input type="text" class="form-control" id="nick" placeholder="Introduce your nickname"></p>';
        string = string + '<button id="submitBtn" type="submit" class="btn btn-primary">Submit</button>';
        string = string + '<div><a href="/auth/google"><img src="./cliente/img/google_icon.png" style="height:40px;"></a></div>';
        string = string + '</div>';
        string = string + '</div></div></div>';
    }
    showListUsers() {
        $("#showbtn").on("click", function () {
            rest.listUsers();
        });
    }

    showRegisterForm() {
        $("#registerForm").remove();
        $("#register").load("./client/register.html", function () {
            $("#registerButton").on("click", function (e) {
                e.preventDefault();
                let email = $("#email").val();
                let pwd = $("#pwd").val();
                if (email && pwd) {
                    //rest.registrarUsuario(nick);
                    console.log(email + " " + pwd);
                }
            });
        });
    }
    checkUser() {
        let nick = $.cookie("nick");
        if (nick) {
            console.log("welcome back, " + nick);
        }
        else {
            wc.showAddUser();
        }
    }
    exit() {
        $.removeCookie("nick");
        location.reload();
    }

}

module.exports.webControl = webControl