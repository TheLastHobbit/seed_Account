const express = require("express");
const { ec: EC } = require("elliptic");
const crypto = require("crypto");
const BN = require("bn.js");
const cors = require("cors");
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const curve = new EC("secp256k1");

// 模拟公钥池
class PublicKeyPool {
    constructor() {
        this.keys = [];
        this.initializePool();
    }

    generateKeyPairs(count) {
        const keys = [];
        for (let i = 0; i < count; i++) {
            const keyPair = curve.genKeyPair();
            keys.push(keyPair.getPublic().encode("hex", true));
        }
        return keys;
    }

    initializePool(minSize = 100) {
        if (this.keys.length < minSize) {
            const newKeys = this.generateKeyPairs(minSize - this.keys.length);
            this.keys = [...this.keys, ...newKeys];
        }
    }

    getRandomKeys(count) {
        const result = [];
        const available = [...this.keys];
        for (let i = 0; i < Math.min(count, available.length); i++) {
            const index = Math.floor(Math.random() * available.length);
            result.push(available[index]);
            available.splice(index, 1);
        }
        return result;
    }
}

const publicKeyPool = new PublicKeyPool();

// 环签名生成函数
function generateRingSignature(message, ring, sk, pk) {
    try {
        const privKey = curve.keyFromPrivate(sk.slice(2), "hex");
        const pubKey = curve.keyFromPublic(pk.slice(2), "hex").getPublic();
        
        // 生成关键映像
        const hash = crypto.createHash("sha256").update(pk).digest("hex");
        const hashPoint = curve.g.mul(new BN(hash, 16));
        const y_0 = hashPoint.mul(privKey.priv);
        const y_0_hex = y_0.encode("hex", true);

        const n = ring.length;
        const sIndex = ring.findIndex(r => r.toLowerCase() === pk.toLowerCase());
        
        if (sIndex === -1) {
            throw new Error("公钥不在环中");
        }

        const c = new Array(n);
        const s = new Array(n);
        
        // 生成随机值alpha
        const alpha = curve.genKeyPair().getPrivate();
        const q = curve.g.mul(alpha);
        
        // 初始化第一个c值
        c[(sIndex + 1) % n] = new BN(crypto.createHash("sha256")
            .update(q.encode("hex") + message + y_0_hex)
            .digest("hex"), 16);

        // 计算环签名
        for (let i = 0; i < n; i++) {
            if (i !== sIndex) {
                s[i] = curve.genKeyPair().getPrivate().toString("hex");
                const pub = curve.keyFromPublic(ring[i].slice(2), "hex").getPublic();
                const left = curve.g.mul(new BN(s[i], 16));
                const right = pub.mul(c[i]);
                c[(i + 1) % n] = new BN(crypto.createHash("sha256")
                    .update(left.add(right).encode("hex") + message + y_0_hex)
                    .digest("hex"), 16);
            }
        }
        
        // 计算签名者的s值
        s[sIndex] = alpha.sub(privKey.priv.mul(c[sIndex])).umod(curve.n).toString("hex");

        return { 
            y_0: y_0_hex, 
            c: c.map(ci => ci.toString("hex")), 
            s: s
        };
    } catch (error) {
        console.error("环签名生成错误:", error);
        throw error;
    }
}

// 生成根账户环签名API
app.post("/generate-ring-signature", async (req, res) => {
    try {
        const { addr_seed, pk_seed, sk_seed } = req.body;
        
        if (!addr_seed || !pk_seed || !sk_seed) {
            return res.status(400).json({ error: "缺少参数" });
        }

        // 获取随机公钥组成环
        const randomPks = publicKeyPool.getRandomKeys(9);
        const ring = [pk_seed, ...randomPks];
        
        // 生成环签名
        const message = addr_seed;
        const signature = generateRingSignature(message, ring, sk_seed, pk_seed);
        
        // 生成关键映像的哈希作为唯一标识
        const keyImage = crypto.createHash("sha256").update(signature.y_0).digest("hex");
        
        res.json({ 
            ring, 
            signature: JSON.stringify(signature), 
            keyImage 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: `错误: ${err.message}` });
    }
});

// 健康检查API
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
});
