const { getPool } = require("./services/sql.service");

(async () => {

    try {

        const pool = await getPool();

        const result = await pool.request().query(`
            SELECT DB_NAME() AS DatabaseName
        `);

        console.log(result.recordset);

        process.exit(0);

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

})();