FROM alpine:edge
# via https://stackoverflow.com/questions/57534295/npm-err-tracker-idealtree-already-exists-while-creating-the-docker-image-for
WORKDIR /fnest
COPY ./ /fnest
RUN apk upgrade
RUN apk add coturn nodejs npm
RUN npm i
