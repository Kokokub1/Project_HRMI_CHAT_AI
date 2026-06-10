const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const glob = require("glob");

const results = [];

glob.sync("C:/HRMI_EXTRACT/**/*.htm").forEach(file => {

    try {

        const html = fs.readFileSync(file, "utf8");

        const $ = cheerio.load(html);

        const content = $("body").text()
            .replace(/\s+/g, " ")
            .trim();

        results.push({
            title: path.basename(file),
            path: file,
            content
        });

    } catch(err) {

        console.log(err.message);

    }

});

fs.writeFileSync(
    "./data/manual.json",
    JSON.stringify(results, null, 2),
    "utf8"
);

console.log(
    `Created ${results.length} manuals`
);