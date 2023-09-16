import nodeDataChannel from "node-datachannel";
import jose from "node-jose";
import {serve} from "@hono/node-server";
import {serveStatic} from "@hono/node-server/serve-static";
import {Hono} from "hono";

// Temporary key store
const keystore = jose.JWK.createKeyStore();
let signer = {}; // Filled in init

const httpApp = new Hono(); // Port: 3040
const httpsApp = new Hono(); // Port: 3044

nodeDataChannel.initLogger("Debug");

function getSdp(){
    return new Promise((res, rej) => {
        const iceServers = {
            iceServers: ["stun:stun.l.google.com:19302"]
        };
        const conn = new nodeDataChannel.PeerConnection("conn", iceServers);
        conn.onLocalDescription((sdp, type) => {
            console.log("Response(SDP)", sdp);
            res(sdp);
        });

        // Activate
        const dc = conn.createDataChannel("main");
    });
}

async function connHandler(c){
    // FIXME: Need to handle exceptions here..?
    const obj = await c.req.json();
    const sdp = await getSdp();
    const enc = await signer(sdp);
    return c.text(enc);
}

async function init(){
    await keystore.generate("EC", "P-256");

    signer = async function(obj){
        const res = await jose.JWS.createSign({format: "compact"},
                                              keystore.all()).
            update(obj).
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
