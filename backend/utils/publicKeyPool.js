const { ec: EC } = require('elliptic');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const curve = new EC('secp256k1');
const POOL_FILE = path.join(__dirname, '../data/publicKeyPool.json');

class PublicKeyPool {
    constructor() {
        this.keys = [];
        this.keyPairs = [];
        this.loadFromFile();
    }

    loadFromFile() {
        try {
            if (fs.existsSync(POOL_FILE)) {
                const data = JSON.parse(fs.readFileSync(POOL_FILE, 'utf8'));
                this.keys = data.keys || [];
                
                // 重新创建密钥对对象
                this.keyPairs = this.keys.map(key => {
                    try {
                        return {
                            publicKey: key,
                            address: this.publicKeyToAddress(key)
                        };
                    } catch (e) {
                        return null;
                    }
                }).filter(kp => kp !== null);
                
                console.log(`从文件加载了 ${this.keys.length} 个公钥`);
            }
            
            this.ensurePoolSize();
        } catch (error) {
            console.error('加载公钥池失败:', error);
            this.ensurePoolSize();
        }
    }

    saveToFile() {
        try {
            // 确保目录存在
            const dir = path.dirname(POOL_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(POOL_FILE, JSON.stringify({
                keys: this.keys,
                updated: new Date().toISOString()
            }));
        } catch (error) {
            console.error('保存公钥池失败:', error);
        }
    }

    generateKeyPairs(count) {
        const newKeyPairs = [];
        
        for (let i = 0; i < count; i++) {
            const keyPair = curve.genKeyPair();
            const publicKey = keyPair.getPublic().encode('hex');
            const address = this.publicKeyToAddress(publicKey);
            
            newKeyPairs.push({
                publicKey,
                address
            });
        }
        
        this.keys = [...this.keys, ...newKeyPairs.map(kp => kp.publicKey)];
        this.keyPairs = [...this.keyPairs, ...newKeyPairs];
        
        this.saveToFile();
        return newKeyPairs;
    }

    publicKeyToAddress(publicKey) {
        // 模拟从公钥生成以太坊地址的过程
        const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
        return '0x' + hash.substring(0, 40);
    }

    ensurePoolSize(minSize = 100) {
        if (this.keys.length < minSize) {
            const needed = minSize - this.keys.length;
            console.log(`公钥池中只有 ${this.keys.length} 个公钥，生成 ${needed} 个新公钥`);
            this.generateKeyPairs(needed);
        }
    }

    getRandomKeys(count) {
        this.ensurePoolSize(count + 10); // 确保池中有足够的公钥
        
        const result = [];
        const available = [...this.keyPairs];
        
        for (let i = 0; i < Math.min(count, available.length); i++) {
            const index = Math.floor(Math.random() * available.length);
            result.push(available[index]);
            available.splice(index, 1);
        }
        
        return result;
    }
    
    // 获取所有公钥及其地址
    getAllKeyPairs() {
        return this.keyPairs;
    }
}

// 创建单例实例
const publicKeyPool = new PublicKeyPool();

module.exports = publicKeyPool; 