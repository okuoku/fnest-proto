import jose from "node-jose";
import fs from "fs";


async function run(){
    const ks = JSON.parse(fs.readFileSync("./keys.json"));
    const cfg = JSON.parse(fs.readFileSync("./config.json"));
    const keystore = await jose.JWK.asKeyStore(ks);

    const eckey = keystore.all({kty: "EC"})[0];
    const rsakey = keystore.all({kty: "RSA"})[0];

    let devicekey = {};

    devicekey.u = cfg.deviceuri;
    devicekey.k = eckey.toJSON(); // Public key only

    console.log("Devicekey", jose.util.base64url.encode(JSON.stringify(devicekey)));
}

run();
