import {serve} from "@hono/node-server";
import {serveStatic} from "@hono/node-server/serve-static";
import {Hono} from "hono";
import devmw from "./nestdevicemw.mjs";

const httpApp = new Hono(); // Port: 3040

async function init(){

    httpApp.post("/con", devmw.con);
    httpApp.post("/ksy0", devmw.ksy0);

    httpApp.use("/*", serveStatic({root: "./pages/device/"}));

    serve({fetch: httpApp.fetch, port: 3040}, i => console.log("http:",i));
}

init();
