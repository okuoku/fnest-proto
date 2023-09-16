import nodeDataChannel from "node-datachannel";
import jose from "node-jose";
import {serve} from "@hono/node-server";
import {serveStatic} from "@hono/node-server/serve-static";
import {Hono} from "hono";
import crypto from "crypto";

function genid(){
    return crypto.randomUUID();
}

// Session management
const sessions = {};
function addSession(){
    const uuid = genid();
    const iceServers = {
        iceServers: ["stun:stun.l.google.com:19302"]
    };
    const conn = new nodeDataChannel.PeerConnection(uuid, iceServers);
    let sdpwaiter = false;
    let sdpfinalized = false;
    let currentsdp = false;
    let currentcandidates = [];

    function iceresult(){
        return {d: currentsdp, c: currentcandidates};
    }

    conn.onLocalDescription((sdp, type) => {
        currentsdp = sdp;
        console.log("SDP", currentsdp);
    });

    conn.onLocalCandidate((candidate, mid) => {
        console.log("Candidate", candidate);
        console.log("mid", mid);
        currentcandidates.push({c: candidate, m: mid});
    });

    conn.onGatheringStateChange((state) => {
        console.log("GATHERING", state);
        if(state == "complete"){
            sdpfinalized = true;
            if(sdpwaiter){
                sdpwaiter(iceresult());
                sdpwaiter = false;
            }
        }
    });

    sessions[uuid] = {
        getSdp: function(){
            return new Promise((res, rej) => {
                if(sdpfinalized){
                    res(iceresult());
                }else{
                    sdpwaiter = res;
                }
            });
        }
    };
    
    // Activate
    const dc = conn.createDataChannel("default");

    return uuid;
}

// Temporary key store
const keystore = jose.JWK.createKeyStore();
let signer = {}; // Filled in init

const httpApp = new Hono(); // Port: 3040
const httpsApp = new Hono(); // Port: 3044

nodeDataChannel.initLogger("Debug");

function getSdp(uuid){
    return sessions[uuid].getSdp();
}

async function connHandler(c){
    // FIXME: Need to handle exceptions here..?
    const obj = await c.req.json();
    const sdp = await getSdp(addSession());
    const enc = await signer(sdp);
    return c.text(enc);
}

async function init(){
    await keystore.generate("EC", "P-256");

    signer = async function(obj){
        const res = await jose.JWS.createSign({format: "compact"},
                                              keystore.all()).
            update(JSON.stringify(obj)).
            final();
        return res;
    }

    httpApp.post("/con", connHandler);

    httpApp.use("/cnt/*", serveStatic({root: "./httpSide/"}));
    httpsApp.use("/cnt/*", serveStatic({root: "./httpsSide/"}));

    serve({fetch: httpApp.fetch, port: 3040}, i => console.log("http:",i));
    serve({fetch: httpsApp.fetch, port: 3044}, i => console.log("https:",i));
}

init();
