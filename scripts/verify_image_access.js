// Quick verify that images are accessible
const https = require('https')
const urls = [
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/5f139c90784f.jpeg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3651d2c23fb2.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/31933e5cf281.jpg',
  'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/abd24400739d.jpg',
]
Promise.all(urls.map(u => new Promise(resolve => {
  const req = https.request(u, { method: 'HEAD' }, res => {
    console.log(`${res.statusCode} | ${u.split('/').pop()}`)
    resolve()
  })
  req.on('error', e => { console.log(`ERR: ${u} - ${e.message}`); resolve() })
  req.end()
})))
