import express from 'express';
import bodyParser from 'body-parser';
import { checkWhitelist, whitelist } from './middleware/index.js';

const { json } = bodyParser;

const proxyPool = {
  'binanceFutures': 'https://fapi.binance.com/fapi/v1/klines',
  'binance': 'https://api.binance.com/api/v3/klines',
  'okx': 'https://www.okx.com/api/v5/market/candles'
};
async function bootstrap() {
  const app = express();

  app.use(json());
  // app.use('*', checkWhitelist)

  /**
   * group name
   * worker id
   */
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
          host: new URL(url).host,
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      // 设置 HTTP 响应状态和 headers
      res.status(fetchResponse.status);
      fetchResponse.headers.forEach((value, key) => res.setHeader(key, value));

      // 根据 Content-Type 处理响应体
      const contentType = fetchResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const body = await fetchResponse.json();
        console.log(body);
        res.status(200).send(body);
      } else {
        const body = await fetchResponse.text();
        res.status(200).send(body);
      }
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
  app.listen(port, async () => {
    console.log(`代理服务器已启动，监听端口 ${port}`);
    // TODO: register to proxy pool
    for (const ip of whitelist.filter(item => item !== '127.0.0.1')) {
      try {
        const response = await fetch(`http://${ip}:6602/ping`);
        if (response.ok) {
          console.log(`已成功注册到代理池:${ip}`);
        } else {
          console.error(`注册到代理池失败：${ip}`);
        }
      } catch (error) {
        console.error(`注册到代理池失败：${ip}`);
      }
    }
  });
}

bootstrap()
