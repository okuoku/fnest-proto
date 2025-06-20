import ndc from "node-datachannel";
import * as jose from "jose";
import crypto from "crypto";
import fs from "fs";
import tester from "./test_bandwidth_node.mjs";
import fnestcfg from "./fnestconfig.mjs";

// Read config and keyblob
const keys = fnestcfg.keys;
const cfg = fnestcfg.cfg;
const SESSION_TIMEOUT = 120 * 1000; // in MS

let pubkey_ksy0 = {}; // Filled in init()
let signer = {}; // Filled in init()
let decrypter = {}; // Filled in init()

// Sessions
const sessions = {};

function new_session(){ // => UUID
    const uuid = crypto.randomUUID();

    let sdpwaiter = false;
    let sdperrorwaiter = false;
    let sdpfinalized = false;
    let currentsdp = false;
    let currentcandidates = [];
    let sentcandidates = 0;
    let conn = false;
    let dc = false;

    let remote_candidate_queue = [];
    let connection_complete = false;

    if(sessions[uuid]){
        throw "???";
    }

    function iceresult(){
        return {
            d: currentsdp,
            c: currentcandidates,
            f: sdpfinalized,
            ident: uuid
        };
    }

    function latch_sdpevent(){
        if(sdpwaiter){
            sdpwaiter(iceresult());
            sdpwaiter = false;
            sdperrorwaiter = false;
        }
    }

    function getsdp(){
        return new Promise((res, rej) => {
            console.log("GetSDP", uuid);
            if(sessions[uuid]){
                if(sdpfinalized){
                    console.log("SDP Finalized", uuid, iceresult());
                    res(iceresult());
                }else if(currentcandidates.length != sentcandidates){
                    console.log("SDP progress", uuid, iceresult(), sentcandidates, currentcandidates.length);
                    sentcandidates = currentcandidates.length;
                    res(iceresult());
                }else if(connection_complete){
                    /* Latch event immediately */
                    res(iceresult());
                }else{
                    /* Wait for the next event */
                    sdpwaiter = function(result){
                        sdpwaiter = false;
                        sdperrorwaiter = false;
                        console.log("SDP Result", uuid, result);
                        res(result);
                    };
                    sdperrorwaiter = function(exp){
                        sdpwaiter = false;
                        sdperrorwaiter = false;
                        console.log("SDP Error", uuid, exp);
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
            console.log("SDP onLocalDescription", sdp, type);
            currentsdp = sdp;
            latch_sdpevent();
        });
        conn.onLocalCandidate((candidate, mid) => {
            console.log("SDP onLocalCandidate", candidate, mid);
            currentcandidates.push({c: candidate, m: mid});
            latch_sdpevent();
        });
        conn.onGatheringStateChange((state) => {
            console.log("SDP onGatheringStateChange", state);
            if(sessions[uuid]){
                if(state == "complete"){
                    sdpfinalized = true;
                    latch_sdpevent();
                }
            }
        });
        conn.onStateChange((state) => {
            console.log("LDC state change", state);
            if(state === "connected"){
                connection_complete = true;
                latch_sdpevent();
            }
        });

        // Activate
        dc = conn.createDataChannel("default");
        tester.dc_tester(dc);
    }


    async function handle_peer_ice(input){
        const sdp = input.s;
        console.log("Peer", uuid, sdp);
        conn.setRemoteDescription(sdp, "answer");
    }

    async function request(input){ // => res
        console.log("Con request", input);
        switch(input.req){
            case "new-connection":
                begin_session();
                return await getsdp([]);
            case "poll-sdp":
                return await getsdp(input.c);
            case "peer-ice":
                await handle_peer_ice(input);
                return {
                    res: "done",
                    ident: uuid
                };
            case "complete":
                delete_session();
                return {
                    res: "done",
                    ident: uuid
                }
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
    let rsakey = {};
    let eckey = {};
    // Export RSA Pubkey (jose does not have pubkey extraction)
    for(const idx in keys.keys){
        const k = keys.keys[idx];
        if(k.kty == "RSA"){ /* RSA Key pair */
            rsakey = await crypto.createPrivateKey({key: k, format: "jwk"});
            const pk = await crypto.createPublicKey({key: k, format: "jwk"});
            pubkey_ksy0 = await jose.exportJWK(pk);
            console.log("Pubkey found", pubkey_ksy0);
        }
        if(k.kty == "EC"){ /* EC Key pair */
            eckey = await crypto.createPrivateKey({key: k, format: "jwk"});
        }
    }
    signer = async function(obj){
        const tgt = JSON.stringify(obj);
        const buf = new TextEncoder().encode(tgt);
        const res = await new jose.CompactSign(buf)
            .setProtectedHeader({alg: "ES256"})
            .sign(eckey);
        return res;
    }
    decrypter = async function(obj){
        const dec = await jose.compactDecrypt(obj, rsakey);
        const out = new TextDecoder().decode(dec.plaintext);
        console.log("Decrypt", dec.protectedHeader, out);
        return out;
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
        const body1 = await decrypter(body0);
        const body = JSON.parse(body1);
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
