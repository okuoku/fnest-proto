function base64uri_encode(str){
    const p = btoa(str);
    return p.replace("+","-").replace("/","_");
}

function base64uri_decode(str){
    const p = str.replace("-","+").replace("_","/");
    return atob(p);
}

function myinput(){
  try{
    const log = document.location;
    const str = location.hash;
    if(str == ""){
      return {};
    }else{
      const s = base64uri_decode(str.substring(1));
      return JSON.parse(s);
    }
  }catch(e){
    console.warn("Invalid hash");
    return {};
  }
}

async function do_req(api, obj){
    console.log("REQUEST(Device)", api, obj);
    const res = await fetch("/" + api, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
        },
        body: obj
    });

    const text = await res.text();
    console.log("Res.(Device)", text);
    return text;
}

async function onLoad(e){
  const target_data = myinput();
  const obj = target_data.d;
  const res = await do_req(target_data.f, obj); // => base64url

  /* calc response_data */
  const b = {
    r: res,
    ses: target_data.ses
  };
  const br = JSON.stringify(b);
  const response_data = base64uri_encode(br);

  /* Navigate back to nestsite */
  window.location.replace(target_data.cb + "#" + response_data);
  return;
}

addEventListener("load", onLoad);
