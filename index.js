import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import bodyParser from 'body-parser';

const { json } = bodyParser;

const app = express();

app.use(json());

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

// 代理路由
app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    console.error('无效的目标服务器名称');
    return res.status(400).send('无效的目标服务器名称');
  }

  console.log(`请求转发到: ${targetUrl}`);

  // 使用 http-proxy-middleware 进行请求转发
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true, // 改变源请求的 origin
    logLevel: 'debug', // 日志级别
    timeout: 5000, // 设置代理超时时间（5秒）
    onError: (err, req, res) => {
      // 错误处理：如果代理请求失败，返回错误信息
      console.error('代理请求失败:', err);
      res.status(500).send('代理请求失败');
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`代理请求的 URL: ${req.originalUrl}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`代理响应: ${proxyRes.statusCode}`);
    }
  });

  // 执行代理请求
  proxy(req, res, next);
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
