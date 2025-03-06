import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import bodyParser from 'body-parser';

const { json } = bodyParser;

const app = express();

app.use(json());

const proxyPool = {
  'binanceFutures': 'https://fapi.binance.com/fapi/v1/klines',
  'binance': 'https://api.binance.com/api/v3/klines',
  'okx': 'https://www.okx.com/api/v5/market/candles'
};


// 获取白名单
const whitelist = process.env.WHITELIST ? process.env.WHITELIST.split(',') : [];
whitelist.push('127.0.0.1');

// 检查请求来源是否在白名单中
function checkWhitelist(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;

  // 清理 IPv6 地址中的前缀
  const cleanIp = clientIp.replace(/^::ffff:/, '');

  if (!whitelist.includes(cleanIp)) {
    console.error('禁止访问：您的 IP 地址不在白名单中', cleanIp);
    return res.status(403).send('禁止访问：您的 IP 地址不在白名单中');
  }

  next();
}

Object.keys(proxyPool).forEach((key) => {
  app.use(`/${key}`, checkWhitelist, (req, res, next) => {
    const targetUrl = proxyPool[key];
    console.log("代理接口到：", targetUrl);
    const proxy = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true, // 改变源请求的 origin
      logLevel: 'debug', // 日志级别
      timeout: 5000, // 设置代理超时时间（5秒）
    });
    proxy(req, res, next);
  })
})

// 自定义接口 1：健康检查
app.get('/ping', (req, res) => {
  res.send('pong');
});

// 启动服务器
const port = 6602;
app.listen(port, () => {
  console.log(`代理服务器已启动，监听端口 ${port}`);
});
