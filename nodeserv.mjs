import {serve} from "@hono/node-server";
import {serveStatic} from "@hono/node-server/serve-static";
import {Hono} from "hono";
import devmw from "./nestdevicemw.mjs";

const httpApp = new Hono(); // Port: 3040
const httpsApp = new Hono(); // Port: 3044

async function init(){

    httpApp.post("/con", devmw.con);
    httpApp.post("/ksy0", devmw.ksy0);

    httpApp.use("/*", serveStatic({root: "./build_device/"}));
    httpsApp.use("/*", serveStatic({root: "./build_site/"}));


    serve({fetch: httpApp.fetch, port: 3040}, i => console.log("http:",i));
    serve({fetch: httpsApp.fetch, port: 3044}, i => console.log("https:",i));
}

init();
