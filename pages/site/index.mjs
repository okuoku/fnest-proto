import jose from "node-jose";

const runbuttonEl = document.getElementById("runbutton");
const devicekeyEl = document.getElementById("devicekey");

async function onClick(e){
    const devicekeytemp = devicekeyEl.value;
    /* Remove whitespaces */
    const devicekeystr = devicekeytemp.replace("\n","").replace("\t","").replace(" ","");
    const devicekey = jose.util.base64url.decode(devicekeystr);
    console.log("Run", devicekey);
}

async function onLoad(e){
    runbuttonEl.addEventListener("click", onClick);
}

addEventListener("load", onLoad);
