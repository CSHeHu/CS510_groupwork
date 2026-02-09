# GitHub Copilot GPT-5 mini was used to help with copying the static compiled
# files from the frontend build to the nginx image
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install --silent
RUN npm run build

FROM nginx:alpine
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
