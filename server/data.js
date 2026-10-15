const mongo = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;

class CAD {
    users = [];
    constructor() {
        this.users = [];
    }

    async connect(callback) {
        let cad = this;
        let client = new mongo("mongodb+srv://manuelserrano10_db_user:xxxx@cluster0.bhuyt2v.mongodb.net/?retryWrites = true & w=majority");
        await client.connect();
        const database = client.db("sistema");
        cad.usuarios = database.collection("usuarios");
        callback(database);
    }

    searchUser(obj, callback) {
        search(this.usuarios, obj, callback);
    }
    insertUser(usuario, callback) {
        insert(this.usuarios, usuario, callback);
    }


    search(collection, criteria, callback) {
        collection.find(criteria).toArray(function (error, users) {
            if (users.length == 0) {
                callback(undefined);
            }
            else {
                callback(users[0]);
            }
        });
    }
    insert(collection, element, callback) {
        collection.insertOne(element, function (err, result) {
            if (err) {
                console.log("error");
            }
            else {
                console.log("New element created");
                callback(element);
            }
        });
    }

    findOrCreateUser(usr, callback) {
        findOrCreate(this.users, usr, callback);
    }

    findOrCreate(collection, criteria, callback) {
        collection.findOneAndUpdate(criteria, { $set: criteria }, {
            upsert: true, returnDocument: "after", projection: { email: 1 }
        }, function (err, doc) {
            if (err) { throw err; }
            else {
                console.log("Elemento actualizado");
                console.log(doc.value.email);
                callback({ email: doc.value.email });
            }
        });
    }


}

module.exports.CAD = CAD