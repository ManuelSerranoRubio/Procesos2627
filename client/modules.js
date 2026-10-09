class System{
    users=[];
    constructor(){
        this.users=[];
    }

    addUser(nick){
        if (this.userExists(nick)){
            return console.log("This user already exists")
        }else{
            this.users.push(new User(nick));
            return console.log("User created");
        }
    }
    listUsers(){
        return this.users;
    }
    numberOfUsers(){
        return this.users.length;
    }

    findUser(nick){
        
        if(this.userExists(nick)){
            for(let i=0;i<this.users.length;i++){
                if (this.users[i].nick == nick){
                
                return i;     
            }
            }
            
        }else{
            console.log("This user does not exist")
        }
    }

    removeUser(nick){
        if (this.userExists(nick)){
            let index = this.users.indexOf(nick);
            this.users.splice(index,1);
            return console.log("User removed");
        }else{
            return console.log("This user does not exist")
        }
    }

    userExists(nick){
        

        for (let i=0;i<this.users.length;i++){
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

