import base64uri from "../../../base64uri.mjs";

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

async function do_req(api, obj){
  const res = await fetch("/" + api, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: obj
  });
  const text = await res.text();

  return text;
}

async function onLoad(e){
  const target_data = myinput();
  const obj = base64uri.encode(target_data.d);
  const res = await do_req(target_data.f, obj);

  /* calc response_data */
  const s = base64uri.decode(res);
  const b = {
    r: s,
    ses: target_data.ses
  };
  const br = JSON.stringify(b);
  const response_data = base64uri.encode(br);

  /* Navigate back to nestsite */
  window.location.href = target_data.cb + "#" + response_data;
  return;
}

addEventListener("load", onLoad);
