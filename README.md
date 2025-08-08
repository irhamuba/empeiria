# 🤖 Empeiria Testnet Faucet Bot

An interactive CLI tool for Empeiria testnet that allows automated token distribution with customizable parameters.

## 🚀 Features

- **Interactive CLI**: User-friendly command-line interface
- **Customizable Transfers**: Set custom amount ranges and delays
- **Multiple Modes**: Send to self, random addresses, or from file
- **Batch Processing**: Handle multiple transactions efficiently
- **Detailed Logging**: Comprehensive transaction history and status
- **Balance Monitoring**: Automatic balance checks

## 📦 Prerequisites

- Node.js 16.0.0 or higher
- npm (comes with Node.js)

## 🛠 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/empe-bot.git
cd empe-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:
```env
# Required
PRIVATE_KEY="your_private_key_hex"
RPC_ENDPOINT="https://rpc-testnet.empe.io/"
LCD_ENDPOINT="https://lcd-testnet.empe.io/"
DENOM="uempe"

# Transfer Settings
MIN_TRANSFER_AMOUNT="100"       # 0.0001 EMPE
MAX_TRANSFER_AMOUNT="300"       # 0.0003 EMPE
MIN_DELAY_MS=10000              # 10 seconds
MAX_DELAY_MS=30000              # 30 seconds
MAX_ADDRESSES_PER_BATCH=10       # Max addresses per batch
FEE_AMOUNT="2000"               # 0.002 EMPE
GAS_LIMIT="200000"              # Gas limit per transaction
```

## 🎯 Usage

### Start Interactive Mode (Recommended)
```bash
npm start
# or
node main.js
```

### Available Scripts

- `npm start` - Start the interactive CLI
- `npm run scrape` - Run address scraper only
- `npm run send` - Send tokens to addresses from file
- `npm run send-random` - Send tokens to random addresses
- `npm run scrape-and-send` - Run scraper followed by sending

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Your wallet's private key in hex | Required |
| `RPC_ENDPOINT` | RPC endpoint for transactions | `https://rpc-testnet.empe.io/` |
| `LCD_ENDPOINT` | LCD endpoint for queries | `https://lcd-testnet.empe.io/` |
| `DENOM` | Token denomination | `uempe` |
| `MIN_TRANSFER_AMOUNT` | Minimum amount to send (in uempe) | `100` |
| `MAX_TRANSFER_AMOUNT` | Maximum amount to send (in uempe) | `300` |
| `MIN_DELAY_MS` | Minimum delay between transactions (ms) | `10000` |
| `MAX_DELAY_MS` | Maximum delay between transactions (ms) | `30000` |
| `FEE_AMOUNT` | Transaction fee (in uempe) | `2000` |
| `GAS_LIMIT` | Gas limit per transaction | `200000` |

## 🛡️ Security Notes

- **Never share your private key**
- Use environment variables for sensitive data
- Double-check transaction details before confirming
- Start with small amounts for testing

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Empeiria Network Team
- Cosmos SDK Community
- All contributors and testers

## 🔍 Verification

Check transaction status at:
- [Empe Testnet Explorer](https://explorer-testnet.empe.io/)
- Search by transaction hash provided in logs

## ⚠️ Important Notes

- Ensure sufficient balance before running
- Test with small amounts first
- Monitor transaction limits and fees
- Use testnet addresses only
- Keep mnemonic secure and private
