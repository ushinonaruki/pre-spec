FROM node:22-alpine

ENV HOSTNAME=0.0.0.0

WORKDIR /app

EXPOSE 3001

CMD ["sh", "-c", "[ -f node_modules/.package-lock.json ] || npm ci && exec npm run dev"]
