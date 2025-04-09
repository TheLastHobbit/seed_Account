// 简单的内存存储，用于存储认证信息
class AuthenticationStore {
  constructor() {
    this.store = new Map();
  }
  
  set(address, authInfo) {
    this.store.set(address.toLowerCase(), authInfo);
  }
  
  get(address) {
    return this.store.get(address.toLowerCase());
  }
  
  remove(address) {
    this.store.delete(address.toLowerCase());
  }
  
  clear() {
    this.store.clear();
  }
}

const authenticationStore = new AuthenticationStore();

// 添加持久化存储
const fs = require('fs');
const path = require('path');
const dataFilePath = path.join(__dirname, '../data/authStore.json');

// 确保数据目录存在
try {
  if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
  }
} catch (error) {
  console.error('创建数据目录失败:', error);
}

// 从文件加载数据
try {
  if (fs.existsSync(dataFilePath)) {
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    Object.keys(data).forEach(key => {
      authenticationStore.store.set(key.toLowerCase(), data[key]); // 统一使用小写地址作为键
    });
    console.log(`已从文件加载 ${Object.keys(data).length} 条认证记录`);
  }
} catch (error) {
  console.error('加载认证数据失败:', error);
}

// 保存数据到文件
function saveToFile() {
  try {
    const data = {};
    authenticationStore.store.forEach((value, key) => {
      data[key] = value;
    });
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('保存认证数据失败:', error);
  }
}

// 修改set方法，统一使用小写地址并持久化
function set(address, data) {
  if (!address) {
    console.error('尝试存储空地址的认证信息');
    return false;
  }
  
  const normalizedAddress = address.toLowerCase();
  console.log(`存储认证信息: ${normalizedAddress}`, {
    hasSoulAddress: !!data.soulAddress,
    hasAuthToken: !!data.authToken,
    timestamp: data.timestamp
  });
  
  authenticationStore.store.set(normalizedAddress, data);
  saveToFile(); // 保存到文件
  return true;
}

// 修改get方法，统一使用小写地址
function get(address) {
  if (!address) {
    console.error('尝试获取空地址的认证信息');
    return null;
  }
  
  const normalizedAddress = address.toLowerCase();
  const data = authenticationStore.store.get(normalizedAddress);
  
  console.log(`获取认证信息: ${normalizedAddress}`, {
    found: !!data,
    hasSoulAddress: data ? !!data.soulAddress : false,
    hasAuthToken: data ? !!data.authToken : false,
    timestamp: data ? data.timestamp : null
  });
  
  return data;
}

// 添加调试方法
function debug() {
  console.log('当前认证存储状态:');
  console.log(`存储项数量: ${authenticationStore.store.size}`);
  authenticationStore.store.forEach((value, key) => {
    console.log(`- ${key}: ${JSON.stringify({
      soulAddress: value.soulAddress,
      authToken: value.authToken ? value.authToken.substring(0, 8) + '...' : null,
      timestamp: value.timestamp,
      beijingTime: value.beijingTime
    })}`);
  });
  return {
    size: authenticationStore.store.size,
    keys: Array.from(authenticationStore.store.keys())
  };
}

module.exports = {
  set,
  get,
  debug
}; 