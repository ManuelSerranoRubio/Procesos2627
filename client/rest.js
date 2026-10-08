function System(){
    this.users=[];

    this.addUser=function(nick){
        if (this.userExists(nick)){
            return console.log("This user already exists")
        }else{
            this.users.push(new User(nick));
        }
    }
    this.listUsers=function(){
        return this.users;
    }

    this.findUser = function(nick){
        
        if(this.userExists(nick)){
            for(i=0;i<this.users.length;i++){
                if (this.users[i].nick == nick){
                
                return i;     
            }
            }
            
        }else{
            console.log("This user does not exist")
        }
    }

    this.removeUser = function(nick){
        if (this.userExists(nick)){
            index = this.users.indexOf(nick);
            this.users.splice(index,1);
            console.log("User removed");
        }else{
            return console.log("This user does not exist")
        }
    }

    this.userExists=function(nick){
        usersLength=this.users.length

        for (i=0;i<this.users.length;i++){
            if (this.users[i].nick == nick){
                
                return true;     
            }

        }
        return false;

    }
}
class User{
    nick;
    constructor(nick){
        this.nick = nick
    }

}

