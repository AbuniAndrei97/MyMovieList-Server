const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");

const pool = createPool({
    host: "iud.h.filess.io",
    user: "licentadb_cheeseroom",
    port: "3307",
    password: "0c807f2beb06f995a20b06c2f62ad75bcdd66420",
    connectionLimit: 10
})

pool.query('select * from users', (err, res) => {
    return console.log(res)
})


