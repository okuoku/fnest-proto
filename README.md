# How to run this demo

1. Install with `npm i`
2. Edit `config.json` (copy `config.json.example`)
3. Run `node _runbuild.mjs` to generate Web pages
4. Run `node keygen.mjs` to generate key pairs
5. Run `node nodeserv.mjs` to start servers (HTTP/HTTPS/WebRTC)
6. Run `node showkey.mjs` to get `devicekey`
7. (Setup reverse proxy -- see below)
8. Access HTTPS side
9. Enter Device key and tap "Set Device Key"
10. Tap "Start session"

## Known issue

* Transfer will pause immediately on the latest macOS/iOS Safari
  * It seems latest Safari do not fire `bufferedamountlow` event
* Signaling message encryption is (intentionally) weak. Perhaps we should switch over AES-GCM etc.

## Device URI

Device URI is `http://<YOUR_LOCAL_IPV4>:3040`. 

Provided `nodeserv.mjs` will listen `0.0.0.0:3040` for HTTP connection.

## Device key

Device key is a JWSed JSON object that contains URI for the device HTTP page and device's EC public key.

```
$ node showkey.mjs
Devicekey eyJ1IjoiaHR0cDovLzE5...
```

Device key always starts with `ey....` 

## Reverse proxy

Provided `nodeserv.mjs` will listen `0.0.0.0:3044` as HTTP server to provide HTTPS site. 

Since WebRTC requires secure context, it must be reverse-proxied as HTTPS using some external service.

For example, if you set up [ngrok](https://ngrok.com/docs/secure-tunnels/tunnels/ssh-reverse-tunnel-agent/) :

```
$ ssh -R 443:localhost:3044 tunnel.jp.ngrok.com http
```

Should do the trick.
