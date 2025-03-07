// 获取白名单
export const whitelist = process.env.WHITELIST ? process.env.WHITELIST.split(',') : [];
whitelist.push('127.0.0.1');

// 检查请求来源是否在白名单中
export function checkWhitelist(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;

  // 清理 IPv6 地址中的前缀
  const cleanIp = clientIp.replace(/^::ffff:/, '');

  if (!whitelist.includes(cleanIp)) {
    console.error('禁止访问：您的 IP 地址不在白名单中', cleanIp);
    return res.status(403).send('禁止访问：您的 IP 地址不在白名单中');
  }

  next();
}
