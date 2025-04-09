const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.json({ message: '环签名根账户后端服务运行中' });
});

module.exports = router;
