const sql = require("mssql");
const config = require("../config/db");

let pool = null;

async function getPool() {

    if (pool) {
        return pool;
    }

    pool = await sql.connect(config);

    return pool;
}

module.exports = {
    sql,
    getPool
};