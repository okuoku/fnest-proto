import jose from "node-jose";
import fs from "fs";

const keystore = jose.JWK.createKeyStore();

async function run(){
    await keystore.generate("EC", "P-256");
    await keystore.generate("RSA", 3072);

    fs.writeFileSync("./keys.json", JSON.stringify(keystore.toJSON(true)));
}

run();
