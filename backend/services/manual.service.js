const { getPool } = require("./sql.service");

async function searchKnowledge(question) {

    const pool = await getPool();

    const result = await pool.request()
        .input("question", question)
        .query(`
            SELECT TOP 5
                Title,
                Content,
                ModuleName
            FROM dbo.HRMI_Knowledge
            WHERE Content LIKE '%' + @question + '%'
               OR Title LIKE '%' + @question + '%'
               OR Keywords LIKE '%' + @question + '%'
        `);

    return result.recordset;
}

module.exports = {
    searchKnowledge
};