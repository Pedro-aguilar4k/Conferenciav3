const { createProxyMiddleware } = require("http-proxy-middleware");

// Encaminha as chamadas /api do CRA para o backend FastAPI (porta 8001)
module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8001",
      changeOrigin: true,
    })
  );
};
