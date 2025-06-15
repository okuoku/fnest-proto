import * as jose from "jose";
import { createPublicKey } from 'crypto';
import fs from "fs";


async function run(){
    const ks = JSON.parse(fs.readFileSync("./keys.json"));
    const cfg = JSON.parse(fs.readFileSync("./config.json"));

    for(const idx in ks.keys){
        const k = ks.keys[idx];
        if(k.kty == "EC"){ /* EC Key pair */
            const key = await createPublicKey({key: k, format: "jwk"});
            const eckey = await jose.exportJWK(key);
            let devicekey = {};

            devicekey.u = cfg.deviceuri;
            devicekey.k = eckey;

            console.log("Devicekey", jose.base64url.encode(JSON.stringify(devicekey)));
            return;
        }
    }
}

run();
