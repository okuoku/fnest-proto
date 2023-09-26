function dc_tester(dc, cb){
    const BUFSIZE = 16 * 1000;
    const LWSIZE = 20;
    const LOW_WATERMARK = BUFSIZE * LWSIZE;
    const QUEUESIZE = 200;
    const dummybuf = new ArrayBuffer(BUFSIZE);

    function onLW(){
        const COUNT = QUEUESIZE - LWSIZE;
        for(let i = 0; i != COUNT; i++){
            dc.send(dummybuf);
        }
    }

    function onMsg(ev){
        cb(ev.data);
    }

    dc.bufferedAmountLowThreshold = LOW_WATERMARK;
    dc.addEventListener("message", onMsg);
    dc.addEventListener("bufferedamountlow", onLW);

    // Send initial content
    for(let i = 0; i != QUEUESIZE; i++){
        dc.send(dummybuf);
    }

}


export default {
    dc_tester: dc_tester
};
