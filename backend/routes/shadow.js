// 存储影子账户链接信息
router.post('/link-shadow', async (req, res) => {
    try {
        const { shadowAddress, ring, keyImage, signature } = req.body;
        
        // 验证环签名
        const isValid = verifyRingSignature(shadowAddress, ring, signature);
        if (!isValid) {
            return res.status(400).json({ error: '环签名验证失败' });
        }
        
        // 检查关键映像是否已使用
        const keyImageExists = await db.keyImages.findOne({ keyImage });
        if (keyImageExists) {
            return res.status(400).json({ error: '关键映像已使用' });
        }
        
        // 存储链接信息
        await db.shadowLinks.insertOne({
            shadowAddress,
            keyImage,
            timestamp: new Date(),
            ring: ring.map(addr => ({ address: addr }))
        });
        
        res.json({ success: true, message: '影子账户链接成功' });
    } catch (error) {
        console.error('链接影子账户失败:', error);
        res.status(500).json({ error: '链接影子账户失败: ' + error.message });
    }
});

// 验证影子账户
router.get('/verify-shadow/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const link = await db.shadowLinks.findOne({ shadowAddress: address });
        
        res.json({
            isValid: !!link,
            linkedAt: link ? link.timestamp : null
        });
    } catch (error) {
        console.error('验证影子账户失败:', error);
        res.status(500).json({ error: '验证影子账户失败: ' + error.message });
    }
}); 