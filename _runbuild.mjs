import {rollup} from "rollup";
import {rollupPluginHTML as htmlplugin} from "@web/rollup-plugin-html";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';


const opts_site = {
    plugins: [
        commonjs(),
        htmlplugin({
                   input: ["index.html", "cnt/*.html"],
                   strictCSPInlineScripts: true,
                   flattenOutput: false,
                   rootDir: "pages/site"
        }),
        nodeResolve({
                    browser: true,
                    preferBuiltins: false
        })
    ]
};

const output_site = {
    format: "iife", dir: "build_site"
};

const opts_dev = {
    plugins: [
        commonjs(),
        htmlplugin({
                   input: ["cnt/*.html"],
                   strictCSPInlineScripts: true,
                   flattenOutput: false,
                   rootDir: "pages/device"
        }),
        nodeResolve({
                    browser: true,
                    preferBuiltins: false
        })
    ]
};

const output_dev = {
    format: "iife", dir: "build_device"
};

async function run(){
    const bundle_site = await rollup(opts_site);
    const bundle_dev = await rollup(opts_dev);
    await bundle_site.write(output_site);
    await bundle_dev.write(output_dev);
}

run();

