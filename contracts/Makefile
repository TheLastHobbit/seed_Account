-include .env

.PHONY: all test clean deploy-sepolia verify

all: clean install build

# 清理
clean:
	forge clean

# 安装依赖
install:
	forge install foundry-rs/forge-std --no-commit

# 构建
build:
	forge build

# 测试
test:
	forge test

# 部署到Sepolia
deploy-sepolia:
	forge script script/Deploy.s.sol:Deploy --rpc-url $(SEPOLIA_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --verify --etherscan-api-key $(ETHERSCAN_API_KEY) --legacy --gas-price 30000000000 -vvvv

# 验证合约
verify:
	forge verify-contract --chain-id 11155111 --compiler-version 0.8.13 --constructor-args $(CONSTRUCTOR_ARGS) $(CONTRACT_ADDRESS) src/SeedCertifier.sol:SeedCertifier $(ETHERSCAN_API_KEY)
