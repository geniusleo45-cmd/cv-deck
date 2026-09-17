require("dotenv").config();

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(() => {
    console.log("Connected!");
    return client.query("SELECT NOW()");
  })
  .then((res) => {
    console.log(res.rows);
  })
  .catch(console.error)
  .finally(() => client.end());