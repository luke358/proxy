import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { checkWhitelist, whitelist } from './middleware/index.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
const { json } = bodyParser;
import http from 'http';

const agent = new http.Agent({
  keepAlive: true, // 复用连接
  maxSockets: 100, // 最大并发连接数
});

const proxyMiddlewareMap = {}
async function bootstrap() {
  const app = express();
  app.use(cors())
  app.use(express.urlencoded({ limit: '1mb', extended: true }));
  app.use(express.json({ limit: '1mb' }));
  // app.use('*', checkWhitelist)

  /**
   * group name
   * worker id
   */
  // 代理路由
  app.use('/proxy', (req, res, next) => {
    let { url } = req.query;
    if (!url) {
      return res.status(400).json({ message: 'url is required' });
    }

    url = decodeURIComponent(url);
    console.log("代理到 url", url);
    const proxyMiddleware = proxyMiddlewareMap[url] || (proxyMiddlewareMap[url] = createProxyMiddleware({
      target: url, // 目标服务器地址
      changeOrigin: true, // 改变源请求的 origin
      logLevel: 'error', // 日志级别
      timeout: 5000, // 设置代理超时时间（5秒）
      agent,
      pathRewrite: (resPath, req) => {
        let path = resPath.replaceAll('/', '');
        const params = new URLSearchParams(req.query);
        params.delete('url');
        return path.split('?')[0] + '?' + params.toString();
      },
    }));
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
  });
}

bootstrap()
