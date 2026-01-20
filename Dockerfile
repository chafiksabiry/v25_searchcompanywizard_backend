FROM node:20

WORKDIR /app

COPY package*.json ./

ENV PORT=5001
ENV MONGODB_URI=mongodb://harx:gcZ62rl8hoME@38.242.208.242:27018/V25_CompanySearchWizard

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
