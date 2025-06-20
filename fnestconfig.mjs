import fs from "fs";
import * as jose from "jose";
import { createPublicKey } from 'crypto';

/* Polyfill __dirname */
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cfginit = false;
let cfgval = false;
let keysval = false;

/* Detect settings source */
const statedir_env = process.env.FNEST_STATEDIR;
const external_ip4 = process.env.FNEST_EXTERNAL_IP4;
const enable_coturn = process.env.FNEST_ENABLE_COTURN;
const statedir = statedir_env ? statedir_env : __dirname;

const keyfile = statedir + "/keys.json";
const cfgfile = statedir + "/config.json";

/* keygen */
async function keygen(){
    const ec = await jose.generateKeyPair("ES256", {extractable: true});
    const rsa = await jose.generateKeyPair("RSA-OAEP", {extractable: true, modulusLength: 3072});

    const eck = await jose.exportJWK(ec.privateKey);
    const rsak = await jose.exportJWK(rsa.privateKey);

    const obj = {keys: [eck, rsak]};

    return obj;
}

/* genkeystr */
async function genkeystr(){
    for(const idx in keysval.keys){
        const k = keysval.keys[idx];
        if(k.kty == "EC"){ /* EC Key pair */
            const key = await createPublicKey({key: k, format: "jwk"});
            const eckey = await jose.exportJWK(key);
            let devicekey = {};

            devicekey.u = cfgval.deviceuri;
            devicekey.k = eckey;

            return jose.base64url.encode(JSON.stringify(devicekey));
        }
    }
}



async function init(){
    if(! cfginit){
        /* Detect/Generate keyfile */
        if(fs.existsSync(keyfile)){
            console.log("Loading key", keyfile);
            keysval = JSON.parse(fs.readFileSync(keyfile));
        }else{
            console.log("Saving key", keyfile);
            const keys = await keygen();
            fs.writeFileSync(keyfile, JSON.stringify(keys));
            keysval = keys;
        }
        if(fs.existsSync(cfgfile)){
            console.log("Loading configfile", cfgfile);
            cfgval = JSON.parse(fs.readFileSync(cfgfile));
        }else{
            cfgval = {};
        }
        if(external_ip4){
            cfgval.deviceuri = "http://" + external_ip4 + ":3040";
        }
        if(enable_coturn){
            if(! external_ip4){
                console.log("ERROR: FNEST_EXTERNAL_IP4 required to enable COTURN");
            }else{
                cfgval.coturn = {};
                cfgval.coturn.ip4 = external_ip4;
            }
        }
        console.log("Config init", cfgval);

        /* Write keystr */
        if(statedir_env){
            const keystr = await genkeystr();
            console.log("Devicekey", keystr);
            fs.writeFileSync(statedir + "/devicekey.txt", keystr);
        }
    }
    cfginit = true;
}

async function cfg(){
    await init();
    return cfgval;
}

async function keys(){
    await init();
    return keysval;
}

export default {
    init: init,
    cfg: cfg,
    keys: keys
};
