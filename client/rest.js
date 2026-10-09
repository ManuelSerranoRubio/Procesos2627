class clientRest{
    addUser(nick){
        var client = this;
        $.getJSON("/addUser/"+nick,function(data){
            if (data.nick == -1){
                console.log("User created");
            }else{
                console.log("This user already exists");
            }
        });
    }

}