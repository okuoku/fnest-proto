import {performance} from "node:perf_hooks";

function dc_tester(dc){
    let received = 0;

    function tick(){
        try {
            dc.sendMessage(JSON.stringify({sent: received,
                                          curtime: performance.now()
            }));
        }catch(e){
        }
    }

    function onMsg(ev){
        received += ev.length;
    }

    dc.onMessage(onMsg);
    setInterval(tick, 1000);
}

export default {
    dc_tester: dc_tester
};
