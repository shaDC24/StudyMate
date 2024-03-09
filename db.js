// db.js
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL || 'postgres://postgres:SHAta123@localhost:5432/studymate');

module.exports = db;
