import { spawn } from "node:child_process";

function run_coturn(opts){
    console.log("Starting coturn", opts);
    const child = spawn("turnserver", [
        "-n",
        "-v",
        "--no-udp",
        "--no-stun",
        "-u", "user:pass",
        "-a",
        "-L", "0.0.0.0",
        "-E", "0.0.0.0",
        "-X", "192.168.1.10/0.0.0.0"
    ], {
        stdio: "inherit"
    });
    return null;
}

export default {
    run_coturn: run_coturn
};
