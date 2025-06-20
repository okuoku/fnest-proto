import fs from "fs";

let cfg = JSON.parse(fs.readFileSync("./config.json"));
const keys = JSON.parse(fs.readFileSync("./keys.json"));

export default {
    cfg: cfg,
    keys: keys
};
