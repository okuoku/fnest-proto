import jose from "node-jose";

const setdevicekeyEl = document.getElementById("setdevicekey");
const runlinkEl = document.getElementById("runlink");

const devicekeyEl = document.getElementById("devicekey");
const BASEURL = window.location.protocol + "//" +
        window.location.host + window.location.pathname.replace("/index.html","");

const sessions = {};
const waiters = {};
let devicekey = false; // FIXME: Allow multiple keys

/* WebRTC states */
const ICE_SERVERS = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};
const RTCconnections = {};

async function newRTC(ses,req){
    const peer = new RTCPeerConnection(ICE_SERVERS);
    const ident = req.ident;

    peer.onicegatheringstatechange = async function(e){
        if(peer.iceGatheringState == "complete"){
            console.log("Sending answer", peer.localDescription);
            await runrequest(ses, "con", {
                req: "peer-ice",
                s: peer.localDescription.sdp,
                ident: ident
            });
            /* We're done */
            await closesession(ses);
        }
    }

    peer.onicecandidate = function(e){
        console.log("On ice candidate", e);
    }

    peer.ondatachannel = function(c){
        console.log("On dataChannel", c);
    }


    const desc = {
        type: "offer",
        sdp: req.d
    };
    await peer.setRemoteDescription(new RTCSessionDescription(desc));


    for(const idx in req.c){
        const candidate = req.c[idx].c;
        const mid = req.c[idx].m;
        console.log("Add candidate", idx, candidate, mid);
        const c = new RTCIceCandidate({candidate: candidate, sdpMid: mid});
        peer.addIceCandidate(c);
    }

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
}


async function endsession(){
    // FIXME: Request close through localStorage messaging
}

function post(ses, cnt, data){
    const prefix = "nestDev." + ses + ".";
    data.cnt = cnt;
    console.log("Post", data);
    window.localStorage.setItem(prefix + "inbox", JSON.stringify(data));
    window.localStorage.setItem(prefix + "in", JSON.stringify(cnt));
}

function consumeoutbox(ses){
    const prefix = "nestDev." + ses + ".";
    window.localStorage.setItem(prefix + "outbox", "null");
}

function getoutbox(ses){
    const prefix = "nestDev." + ses + ".";
    const outstr = window.localStorage.getItem(prefix + "out");
    const outboxstr = window.localStorage.getItem(prefix + "outbox");
    let out = false;
    let outbox = false;
    if(outstr){
        out = JSON.parse(outstr);
    }
    if(outboxstr){
        outbox = JSON.parse(outboxstr);
    }
    console.log("out",out,outbox);
    if(out && out != 0){
        if(outbox && outbox != null){
            if(outbox.cnt == out){
                console.log("outbox", outbox);
                return outbox;
            }
        }
    }
    return false;
}

function wait(ses, cnt){
    return new Promise((res, rej) => {
        // Try earlycut
        const curbox = getoutbox(ses);
        if(curbox){
            consumeoutbox(ses);
            res(curbox);
        }else{
            // Register a waiter
            if(waiters[ses]){
                throw "something wrong";
            }
            waiters[ses] = {res: res, rej: rej, ses: ses, cnt: cnt};
            console.log("waiting...", waiters[ses]);
        }
    });
}

function onStorage(){
    const todelete = [];
    console.log("OnStorage");
    // Run all waiters
    for(const ses in waiters){
        const curbox = getoutbox(ses);
        if(curbox){
            if(waiters[ses] && curbox.cnt == waiters[ses].cnt){
                consumeoutbox(ses);
                todelete.push(waiters[ses]);
                waiters[ses].res(curbox);
            }else{
                /* Should not happen(multiple waiters on same ses) */
                console.log("Invalid waiter", sessions[ses], waiters[ses]);
                todelete.push(waiters[ses]);
                waiters[ses].rej(false);
            }
        }
    }

    console.log("Storage done", todelete);
    // Remove waiter if it did not queued new waiter
    for(const idx in todelete){
        const p = todelete[idx];
        const w = waiters[p.ses];
        if(w){
            if(w.cnt == p.cnt){
                delete waiters[p.ses];
            }
        }
    }
}

async function encryptpayload(ses, input){
    if(sessions[ses].enckey){
        const enc = await jose.JWE.createEncrypt({format: "compact"},
                                                 sessions[ses].enckey).
            update(JSON.stringify(input)).final();
        console.log("Encrypt",ses, input, enc);
        return enc;
    }else{
        console.log("Plaintext", ses, input);
        return input;
    }
}


async function closesession(ses){
    const prefix = "nestDev." + ses + ".";
    console.log("Close session",ses);
    const mycnt = sessions[ses].cnt + 1;
    sessions[ses].cnt = mycnt;
    post(ses, mycnt, {func: "close"});
    delete sessions[ses];
}

async function runrequest(ses, func, input){
    const prefix = "nestDev." + ses + ".";
    console.log("Runrequest",ses,func,input);
    const mycnt = sessions[ses].cnt + 1;
    sessions[ses].cnt = mycnt;
    const payload = await encryptpayload(ses, input);
    post(ses, mycnt, {data: payload, func: func});
    const res = await wait(ses, mycnt);
    const vopts = {algorithms: "ES*"};
    const data = res.data;

    /* Verify response */
    console.log("Decoding", sessions[ses].signkey.keystore, data);
    const v = await jose.JWS.createVerify(sessions[ses].signkey.keystore, 
                                          vopts).
        verify(data);
    const msg = JSON.parse(v.payload.toString());
    console.log("msg", msg);
    return msg;
}

async function setDeviceKey(e){
    const devicekeytemp = devicekeyEl.value;
    /* Remove whitespaces */
    const devicekeystr = devicekeytemp.replace("\n","").replace("\t","").replace(" ","");
    devicekey = JSON.parse(jose.util.base64url.decode(devicekeystr));
    console.log("BaseURL", BASEURL);

    // FIXME: Register session
    const signkey = await jose.JWK.asKey(devicekey.k);
    const uri = devicekey.u;
    const ses = "000"; // FIXME: crypto.randomUUID();
    const prefix = "nestDev." + ses + ".";
    const sd = { ses: ses };
    const wndf = "noopener,noreferrer";
    const session_data = jose.util.base64url.encode(JSON.stringify(sd));
    const sesdata = {
        ses: ses,
        signkey: signkey,
        enckey: false,
        uri: uri,
        cnt: 0
    };
    window.localStorage.setItem(prefix + "out", "0");
    window.localStorage.setItem(prefix + "outbox", "false");
    window.localStorage.setItem(prefix + "cb", JSON.stringify(uri));
    post(ses, 0, {}); // Init inbox
    runlinkEl.setAttribute("href", BASEURL + "/cnt/talk.html#" + session_data);
    runlinkEl.setAttribute("_session", ses);
    sessions[ses] = sesdata;
    setdevicekeyEl.disabled = true;
    
}

async function onLinkClick(e){
    const ses = runlinkEl.getAttribute("_session");
    const ek = await runrequest(ses, "ksy0", false);
    const enckey = await jose.JWK.asKey(ek);
    sessions[ses].enckey = enckey;

    /* Create RTC session */
    const desc = await runrequest(ses, "con", {req: "new-connection"});
    console.log("Got desc", desc);
    await newRTC(ses, desc);
}

async function onLoad(e){
    setdevicekeyEl.addEventListener("click", setDeviceKey);
    runlinkEl.addEventListener("click", onLinkClick);
}

addEventListener("load", onLoad);
addEventListener("storage", onStorage);
