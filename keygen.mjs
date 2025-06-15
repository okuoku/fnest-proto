import * as jose from "jose";
import fs from "fs";

async function run(){
    const ec = await jose.generateKeyPair("ES256", {extractable: true});
    const rsa = await jose.generateKeyPair("RSA-OAEP", {extractable: true, modulusLength: 3072});

    const eck = await jose.exportJWK(ec.privateKey);
    const rsak = await jose.exportJWK(rsa.privateKey);

    const obj = {keys: [eck, rsak]};


    fs.writeFileSync("./keys.json", JSON.stringify(obj));
}

run();
