// API配置
const config = {
  // API基础URL
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003',
  
  // API端点
  endpoints: {
    generateSignature: '/api/generate-signature',
    verifyCertification: '/api/verify-certification',
    verifyShadowSignature: '/api/verify-shadow-signature',
    generateShadowProof: '/api/generate-shadow-proof',
    debugAuthStore: '/api/debug-auth-store'
  },
  
  // 获取完整URL
  getApiUrl: function(endpoint) {
    return this.apiBaseUrl + this.endpoints[endpoint];
  }
};

export default config; 