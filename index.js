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

// Object.keys(proxyPool).forEach((key) => {

// })

app.use('/proxy', async (req, res) => {
  const { name, url } = req.query;

  if (!name || !url || !proxyPool[name]) {
    return res.status(400).send('error: invalid request');
  }

  try {
    console.log(`代理请求到: ${url}`);

    const fetchResponse = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(url).host
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    // 设置 HTTP 响应状态和 headers
    res.status(fetchResponse.status);
    fetchResponse.headers.forEach((value, key) => res.setHeader(key, value));

    // ✅ 解决流传输问题
    const body = await fetchResponse.text(); // 或者用 .json() 解析 JSON 数据
    res.send(body);
  } catch (error) {
    console.error('代理请求失败:', error);
    res.status(500).send('代理请求失败');
  }
});

// 自定义接口 1：健康检查
app.get('/ping', (req, res) => {
  res.send('pong');
});

// 启动服务器
const port = 6602;
app.listen(port, () => {
  console.log(`代理服务器已启动，监听端口 ${port}`);
});
