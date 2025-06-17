# How to run this demo

(TBD)

## Known issue

* Transfer will pause immediately on the latest macOS/iOS Safari
  * It seems latest Safari do not fire `bufferedamountlow` event
* Signaling message encryption is (intentionally) weak. Perhaps we should switch over AES-GCM etc.

## Device URI

Device URI is `http://<YOUR_LOCAL_IPV4>:3040`. 

Provided `nodeserv.mjs` will listen `0.0.0.0:3040` for HTTP connection.

## Device key

Device key is a base64url JSON object that contains URI for the device HTTP page and device's EC public key.

```
$ node showkey.mjs
Devicekey eyJ1IjoiaHR0cDovLzE5...
```

Device key always starts with `ey....` 

