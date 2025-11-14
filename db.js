const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if(!connectionString) {
  console.warn('WARNING: DATABASE_URL is not set. Some DB operations will fail.');
}

const pool = new Pool({
  connectionString,
  ssl: (process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : false,
});

if (process.env.NODE_ENV === 'production') {
  console.log('DB: Using production SSL configuration for Postgres connection');
} else {
  console.log('DB: Running in development mode; SSL for Postgres is disabled');
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
