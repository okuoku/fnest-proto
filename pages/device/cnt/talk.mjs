import jose from "node-jose";

function myinput(){
  try{
    const log = document.location;
    const str = location.hash;
    if(str == ""){
      return {};
    }else{
      const s = jose.util.base64url.decode(str.substring(1));
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
  const obj = jose.util.base64url.encode(target_data.d);
  const res = await do_req(target_data.f, obj);

  /* calc response_data */
  const s = jose.util.base64url.decode(res);
  const b = {
    r: s,
    ses: target_data.ses
  };
  const br = JSON.stringify(b);
  const response_data = jose.util.base64url.encode(br);

  /* Navigate back to nestsite */
  window.location.href = target_data.cb + "#" + response_data;
  return;
}

addEventListener("load", onLoad);
