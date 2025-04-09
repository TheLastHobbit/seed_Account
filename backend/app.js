const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const { generateRingSignature, verifyRingSignature } = require('./utils/ringSignature');

const indexRouter = require('./routes/index');
const signatureRouter = require('./routes/signature');

const app = express();

// 设置端口为3003
const PORT = process.env.PORT || 3003;
app.set('port', PORT);

app.use(cors({
  origin: 'http://localhost:3000', // 前端地址
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api', signatureRouter);

// 将函数添加到全局作用域，以便路由可以访问
global.generateRingSignature = generateRingSignature;
global.verifyRingSignature = verifyRingSignature;

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
}

module.exports = app;
