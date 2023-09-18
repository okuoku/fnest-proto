import base64uri from "../../../base64uri.mjs";

let ses = false;

function myinput(){
  try{
    const log = document.location;
    const str = location.hash;
    if(str == ""){
      return {};
    }else{
      const s = base64uri.decode(str.substring(1));
      return JSON.parse(s);
    }
  }catch(e){
    console.warn("Invalid hash");
    return {};
  }
}
function getval(name){
    const prefix = "nestdev." + ses + ".";
    const str = window.localStorage.getItem(prefix + name);
    if(str){
        const obj = JSON.parse(str);
        return obj;
    }else{
        return false;
    }
}

function getInbox(){
    return {
        in: getval("in"),
        inbox: getval("inbox")
    };
}
function clearInbox(){
    const prefix = "nestdev." + ses + ".";
    window.localStorage.setItem(prefix + "inbox", "false");
}

function setOutBox(obj){
    const prefix = "nestdev." + ses + ".";
    const outcnt = getval("out");
    if(! outcnt){
        outcnt = 1;
    }else{
        outcnt++;
    }

    /* Set `outbox`, then `out` */
    const str_outbox = JSON.stringify({cnt: outcnt, data: obj});
    const str_out = JSON.stringify(outcnt);
    window.localStorage.setItem(prefix + "outbox", str_outbox);
    window.localStorage.setItem(prefix + "out", str_out);
}

function action(func, data){
    const prefix = "nestdev." + ses + ".";
    const cb = window.localStorage.getItem(prefix + "cb");
    const myurl = window.location.protocol + "//" + 
        window.location.host + window.location.pathname;

    const req = {
        cb: myurl,
        f: func,
        d: base64uri.decode(data),
        ses: ses
    };
    const target_data = base64uri.encode(JSON.stringify(req));

    window.location.href = cb + "#" + target_data;
}

function checkNewMessage(){
    const cur = getInbox();
    if(cur.in == cur.inbox.cnt){
        clearInbox();
        action(cur.inbox.func, cur.inbox.data);
    }
}

async function onStorage(e){
    checkNewMessage();
}

async function onLoad(e){
    const session_data = myinput();
    const session = session_data.ses;
    if(session_data.err){
        console.log("Error??", err);
        throw err;
    }
    console.log("Start session", session);
    ses = session;

    if(session_data.r){
        setOutBox(session_data.r);
    }

    checkNewMessage();
    addEventListener("storage", onStorage);
}

addEventListener("load", onLoad);

