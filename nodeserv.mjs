import {serve} from "@hono/node-server";
import {serveStatic} from "@hono/node-server/serve-static";
import {Hono} from "hono";
import devmw from "./nestdevicemw.mjs";
import fnestcfg from "./fnestconfig.mjs";
import coturn from "./run_coturn.mjs";

const httpApp = new Hono(); // Port: 3040

async function init(){
    httpApp.post("/con", devmw.con);
    httpApp.post("/ksy0", devmw.ksy0);

    httpApp.use("/*", serveStatic({root: "./pages/device/"}));

    if(fnestcfg.cfg.coturn){
        coturn.run_coturn(cfg.coturn);
    }

    serve({fetch: httpApp.fetch, port: 3040}, i => console.log("http:",i));
}

init();
