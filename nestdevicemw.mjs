import ndc from "node-datachannel";
import jose from "node-jose";
import crypto from "crypto";
import fs from "fs";

// Read config and keyblob
const keys = JSON.parse(fs.readFileSync("./keys.json"));
const cfg = JSON.parse(fs.readFileSync("./config.json"));
const SESSION_TIMEOUT = 10 * 1000; // in MS

let keystore = {}; // Filled in init()
let pubkey_ksy0 = {}; // Filled in init()
let signkey = {}; // Filled in init()
let signer = {}; // Filled in init()

// Sessions
const sessions = {};

async function new_session(){ // => UUID
    const uuid = crypto.randomUUID();
    let state = "pre-init";

    let sdpwaiter = false;
    let sdperrorwaiter = false;
    let sdpfinalized = false;
    let currentsdp = false;
    let currentcandidates = [];

    if(sessions[uuid]){
        throw "???";
    }

    function iceresult(){
        return {
            d: currentsdp,
            c: currentcandidates,
            ident: uuid
        };
    }

    function getsdp(){
        return new Promise((res, rej) => {
            if(sessions[uuid]){
                if(sdpfinalized){
                    res(iceresult);
                }else{
                    sdpwaiter = res;
                    sdperrorwaiter = rej;
                }
            }else{
                res(false);
            }
        });
    }

    function delete_session(){
        if(sdperrorwaiter){
            sdperrorwaiter("session deleted");
        }
    }

    function begin_session(){
        const opts = {
            iceServers: ["stun:stun.l.google.com:19302"]
        };
        const conn = new ndc.PeerConnection(uuid, opts);

        conn.onLocalDescription((sdp, type) => {
            currentsdp = sdp;
        });
        conn.onLocalCandidate((candidate, mid) => {
            currentcandidates.push({c: candidate, m: mid});
        });
        conn.onGatheringStateChange((state) => {
            if(sessions[uuid]){
                if(state == "complete"){
                    sdpfinalized = true;
                    if(sdpwaiter){
                        sdpwaiter(iceresult());
                        sdpwaiter = false;
                        sdperrorwaiter = false;
                    }
                }
            }
        });

        // Activate
        const dc = conn.createDataChannel("default");
    }

    async function handle_peer_ice(input){
        const sdp = input.s;
        conn.setRemoteDescription(sdp);
    }

    async function request(input){ // => res
        switch(state) {
            case "pre-init":
                if(input.req == "new-connection"){
                    state = "wait-peer-ice";
                    return await getsdp();
                }else{
                    throw "???";
                }
            case "wait-peer-ice":
                await handle_peer_ice(input);
                return {
                    res: "done",
                    ident: uuid
                };
            default:
                throw "???";
        }
    }

    sessions[uuid] = {
        begin_session: begin_session,
        delete_session: delete_session,
        request: request
    };

    setTimeout(delete_session, delete_session);

    return uuid;
}

async function init(){
    keystore = await jose.JWK.asKeyStore(keys);
    pubkey_ksy0 = keystore.all({kty: "RSA"})[0];
    signkey = keystore.all({kty: "EC"})[0];
    signer = async function(obj){
        const res = await jose.JWS.createSign({format: "compact", signkey}).
            update(JSON.stringify(obj)).
            final();
        return res;
    }
}

async function mw_ksy0(ctx, next){
    const blob = await signer(pubkey_ksy0);
    return c.text(blob);
}

async function mw_con(ctx, next){
    const opts = {
        algorithms: ["RS*"]
    };
    try {
        const body0 = await c.req.text();
        const body = await jose.JWE.createDecrypt(keystore, opts).
            decrypt(body0);
        console.log("Input(con)", body);
        if(sessions[body.ident]){
            const res = await sessions[body.ident].request(body);
            const out = await signer(res);
            ctx.text(out);
        }else{
            ctx.status(404);
            ctx.text("Specified ident was removed already.");
        }
    }catch(e){
        console.log("Err(con)", e);
        ctx.status(500);
        ctx.text("Something wrong");
    }
}

ndc.initLogger("Debug");
init();

export default {
    ksy0: mw_ksy0,
    con: mw_con
};
