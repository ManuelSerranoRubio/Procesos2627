// CAPA DE ACCESO A DATOS.
// La lógica de negocio no conoce MongoDB: sólo usa estos repositorios.
// Eso permite probar la lógica con un repositorio en memoria y cambiar
// a persistencia real sin modificar server/logic.js.
const { MongoClient } = require('mongodb');

class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
  }

  async findByEmail(email) {
    const normalized = String(email).toLowerCase();
    return [...this.users.values()].find((u) => u.email === normalized) || null;
  }

  async findById(id) {
    return this.users.get(id) || null;
  }

  async findByConfirmationToken(token) {
    if (!token) return null;
    return [...this.users.values()].find((u) => u.confirmationToken === token) || null;
  }

  async create(user) {
    const stored = { ...user };
    this.users.set(stored.id, stored);
    return { ...stored };
  }

  async update(id, changes) {
    const current = this.users.get(id);
    if (!current) return null;
    const updated = { ...current, ...changes };
    this.users.set(id, updated);
    return { ...updated };
  }

  async remove(id) {
    return this.users.delete(id);
  }

  async list() {
    return [...this.users.values()].map((u) => ({ ...u }));
  }
}

class MongoUserRepository {
  constructor(collection) {
    this.collection = collection;
  }

  // Devuelve { repository, client } para poder cerrar la conexión al terminar.
  static async connect(uri, dbName) {
    const client = new MongoClient(uri);
    await client.connect();
    const collection = client.db(dbName).collection('users');
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ confirmationToken: 1 }, { sparse: true });
    return { repository: new MongoUserRepository(collection), client };
  }

  async findByEmail(email) {
    return this.collection.findOne({ email: String(email).toLowerCase() });
  }

  async findById(id) {
    return this.collection.findOne({ id });
  }

  async findByConfirmationToken(token) {
    if (!token) return null;
    return this.collection.findOne({ confirmationToken: token });
  }

  async create(user) {
    await this.collection.insertOne({ ...user });
    return user;
  }

  async update(id, changes) {
    return this.collection.findOneAndUpdate(
      { id },
      { $set: changes },
      { returnDocument: 'after' },
    );
  }

  async remove(id) {
    const result = await this.collection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  async list() {
    return this.collection.find({}).toArray();
  }
}

module.exports = { InMemoryUserRepository, MongoUserRepository };
