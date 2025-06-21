FROM alpine:edge
# via https://stackoverflow.com/questions/57534295/npm-err-tracker-idealtree-already-exists-while-creating-the-docker-image-for
RUN apk upgrade
# busybox-extras for telnet
RUN apk add coturn nodejs npm busybox-extras tcpdump
WORKDIR /fnest
COPY ./ /fnest
RUN npm i
