import {serve} from "@hono/node-server";
import {serveStatic} from "@hono/node-server/serve-static";
import {Hono} from "hono";

const httpApp = new Hono(); // Port: 3040
const httpsApp = new Hono(); // Port: 3044

httpApp.use("/cnt/*", serveStatic({root: "./httpSide/"}));
httpsApp.use("/cnt/*", serveStatic({root: "./httpsSide/"}));

serve({fetch: httpApp.fetch, port: 3040}, i => console.log("http:",i));
serve({fetch: httpsApp.fetch, port: 3044}, i => console.log("https:",i));

