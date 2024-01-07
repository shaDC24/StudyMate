// db.js
const pgp = require('pg-promise')();
const db = pgp(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/studymate');

module.exports = db;
