import ndc from "node-datachannel";
import jose from "node-jose";
import crypto from "crypto";
import fs from "fs";
import tester from "./test_bandwidth_node.mjs";

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

function new_session(){ // => UUID
    const uuid = crypto.randomUUID();
    let state = "pre-init";

    let sdpwaiter = false;
    let sdperrorwaiter = false;
    let sdpfinalized = false;
    let currentsdp = false;
    let currentcandidates = [];
    let conn = false;
    let dc = false;

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
                    sdpwaiter = function(result){
                        sdpwaiter = false;
                        sdperrorwaiter = false;
                        res(result);
                    };
                    sdperrorwaiter = function(exp){
                        sdpwaiter = false;
                        sdperrorwaiter = false;
                        rej(exp);
                    };
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
        conn = new ndc.PeerConnection(uuid, opts);

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
        dc = conn.createDataChannel("default");
        tester.dc_tester(dc);
    }


    async function handle_peer_ice(input){
        const sdp = input.s;
        console.log(sdp);
        conn.setRemoteDescription(sdp, "answer");
    }

    async function request(input){ // => res
        console.log("Con request", input);
        switch(state) {
            case "pre-init":
                if(input.req == "new-connection"){
                    state = "wait-peer-ice";
                    begin_session();
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

    setTimeout(delete_session, SESSION_TIMEOUT);

    return uuid;
}

async function init(){
    keystore = await jose.JWK.asKeyStore(keys);
    pubkey_ksy0 = keystore.all({kty: "RSA"})[0];
    signkey = keystore.all({kty: "EC"})[0];
    signer = async function(obj){
        const res = await jose.JWS.createSign({format: "compact"}, signkey).
            update(JSON.stringify(obj)).
            final();
        return res;
    }
}

async function mw_ksy0(ctx, next){
    const blob = await signer(pubkey_ksy0);
    console.log("ksy0", blob);
    return ctx.text(blob);
}

async function mw_con(ctx, next){
    const opts = {
        algorithms: ["RSA*", "A*"]
    };
    try {
        const body0 = await ctx.req.text();
        console.log("Con reqbody", body0);
        const body1 = await jose.JWE.createDecrypt(keystore, opts).
            decrypt(body0);
        const body = JSON.parse(body1.payload);
        console.log("Input(con)", body);
        if(body.req && body.req == "new-connection"){
            const ident = new_session();
            console.log("new", ident, sessions[ident]);
            const res = await sessions[ident].request(body);
            const out = await signer(res);
            return ctx.text(out);
        }else if(sessions[body.ident]){
            const res = await sessions[body.ident].request(body);
            const out = await signer(res);
            return ctx.text(out);
        }else{
            ctx.status(404);
            return ctx.text("Specified ident was removed already.");
        }
    }catch(e){
        console.log("Err(con)", e);
        ctx.status(500);
        return ctx.text("Something wrong");
    }
}

//ndc.initLogger("Debug");
init();

export default {
    ksy0: mw_ksy0,
    con: mw_con
};
