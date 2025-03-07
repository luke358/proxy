import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { checkWhitelist, whitelist } from './middleware/index.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
const { json } = bodyParser;

const proxyPool = {
  'binanceFutures': 'https://fapi.binance.com/fapi/v1/klines',
  'binance': 'https://api.binance.com/api/v3/klines',
  'okx': 'https://www.okx.com/api/v5/market/candles',
  'data': 'http://data.kernel-trading.com/ohlcv/data',
};
async function bootstrap() {
  const app = express();
  app.use(cors())
  app.use(json());
  // app.use('*', checkWhitelist)

  /**
   * group name
   * worker id
   */


  // 代理路由
  app.use('/proxy', (req, res, next) => {
    const { group } = req.query;
    if (!group || !proxyPool[group]) {
      return res.status(400).json({ message: 'group is required' });
    }

    const proxyMiddleware = createProxyMiddleware({
      target: proxyPool[group], // 目标服务器地址
      changeOrigin: true, // 改变源请求的 origin
      logLevel: 'debug', // 日志级别
      timeout: 5000, // 设置代理超时时间（5秒）
      pathRewrite: (resPath, req) => {
        console.log(resPath)
        return resPath.replaceAll('/', '');
      },
    });
    proxyMiddleware(req, res, next);
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
