FROM node:18-alpine
WORKDIR /emote-generator
COPY package.json tsconfig.json ./
RUN npm install 
COPY src ./src
RUN npm install 
RUN npm run build
CMD ["npm", "start"]
