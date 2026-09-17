require("dotenv").config();

console.log("DIRECT_URL =", process.env.DIRECT_URL);

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DIRECT_URL,
});

client.connect()
  .then(() => {
    console.log("DIRECT_URL connected successfully");
    return client.end();
  })
  .catch((err) => {
    console.error("Connection failed:");
    console.error(err);
  });