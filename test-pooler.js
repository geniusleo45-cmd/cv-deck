require("dotenv").config();

console.log("DATABASE_URL =", process.env.DATABASE_URL);

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => {
    console.log("DATABASE_URL connected successfully");
    return client.end();
  })
  .catch(console.error);