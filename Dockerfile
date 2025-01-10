# Build stage for osu-tools
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS osu-tools-build
WORKDIR /build
RUN git clone https://github.com/ppy/osu-tools.git
WORKDIR /build/osu-tools/PerformanceCalculator
RUN dotnet publish -c Release -r linux-x64 --self-contained false

# Build stage for TypeScript
FROM node:20 AS ts-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final stage
# Changed this line to use the runtime image instead of slim
FROM mcr.microsoft.com/dotnet/runtime:8.0
WORKDIR /app

# Install Node.js in the final image
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ts-build /app/dist ./dist
COPY --from=ts-build /app/package*.json ./
COPY --from=osu-tools-build /build/osu-tools/PerformanceCalculator/bin/Release/net8.0/linux-x64/ ./dist/PerformanceCalculatorLinux/

RUN npm install --production
RUN chmod +x ./dist/PerformanceCalculatorLinux/PerformanceCalculator
RUN mkdir -p ./dist/cache

EXPOSE 3000
CMD ["node", "dist/server.js"]