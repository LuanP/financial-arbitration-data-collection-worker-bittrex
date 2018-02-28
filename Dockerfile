FROM node:8

EXPOSE 3308

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "local"]
