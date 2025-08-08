#!/usr/bin/env node

require('dotenv').config();
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const { DirectSecp256k1Wallet } = require('@cosmjs/proto-signing');
const { SigningStargateClient } = require('@cosmjs/stargate');
const { randomBytes } = require('crypto');

// Helper functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const formatAmount = (amount) => (amount / 1e6).toFixed(6);

// Arrow-key menu selector (no extra deps)
async function selectFromList(question, options, defaultIndex = 0) {
    return new Promise((resolve) => {
        const rlModule = require('readline');
        rlModule.emitKeypressEvents(process.stdin);
        const isRawSupported = process.stdin.isTTY && typeof process.stdin.setRawMode === 'function';
        let index = Math.min(Math.max(defaultIndex, 0), options.length - 1);

        const render = () => {
            console.log(question);
            options.forEach((opt, i) => {
                const prefix = i === index ? '❯' : ' ';
                const style = i === index ? '\u001b[36m' : '';
                const reset = '\u001b[0m';
                console.log(`${prefix} ${style}${opt}${reset}`);
            });
            console.log('(Use ↑/↓ and press Enter)');
        };

        const cleanup = () => {
            if (isRawSupported) process.stdin.setRawMode(false);
            process.stdin.removeListener('keypress', onKeypress);
        };

        const onKeypress = (str, key) => {
            if (!key) return;
            if (key.name === 'up') {
                index = (index - 1 + options.length) % options.length;
                console.clear();
                render();
            } else if (key.name === 'down') {
                index = (index + 1) % options.length;
                console.clear();
                render();
            } else if (key.name === 'return' || key.name === 'enter') {
                cleanup();
                console.log(`Selected: ${options[index]}\n`);
                resolve(options[index]);
            } else if (key.name === 'c' && key.ctrl) {
                cleanup();
                process.exit(1);
            }
        };

        console.clear();
        render();
        if (isRawSupported) process.stdin.setRawMode(true);
        process.stdin.on('keypress', onKeypress);
    });
}

// Ask user for input
function askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
        const prompt = defaultValue ? ` [${defaultValue}]: ` : ': ';
        readline.question(question + prompt, (answer) => {
            resolve(answer || defaultValue);
        });
    });
}

async function main() {
    try {
        console.log('🚀 EMPE Bulk Sender\n');
        
        // First: choose destination mode via arrow keys
        const destMode = (await selectFromList('Choose destination mode', ['self', 'random'], 0)).toLowerCase();

        // Then: numeric inputs
        const txCount = parseInt(await askQuestion('Enter number of transactions', '5'));
        const minAmount = parseFloat(await askQuestion('Enter minimum amount (in EMPE)', '0.001')) * 1e6;
        const maxAmount = parseFloat(await askQuestion('Enter maximum amount (in EMPE)', '0.005')) * 1e6;
        const minDelay = parseInt(await askQuestion('Enter minimum delay between TXs (seconds)', '10')) * 1000;
        const maxDelay = parseInt(await askQuestion('Enter maximum delay between TXs (seconds)', '30')) * 1000;
        
        // Configuration with user input
        const config = {
            rpcEndpoint: process.env.RPC_ENDPOINT || 'https://rpc-testnet.empe.io',
            denom: process.env.DENOM || 'uempe',
            minAmount: minAmount,
            maxAmount: maxAmount,
            minDelayMs: minDelay,
            maxDelayMs: maxDelay,
            txCount: txCount,
            fee: { 
                amount: [{ 
                    denom: process.env.DENOM || 'uempe', 
                    amount: process.env.FEE_AMOUNT || '2000'  // 0.002 EMPE
                }], 
                gas: process.env.GAS_LIMIT || '200000' 
            },
            memo: 'empire-bot-tx'
        };
        
        // Show configuration
        console.log('\n⚙️  Configuration:');
        console.log('- RPC Endpoint:', config.rpcEndpoint);
        console.log('- Number of TXs:', config.txCount);
        console.log('- Amount Range:', `${formatAmount(config.minAmount)} - ${formatAmount(config.maxAmount)} EMPE`);
        console.log('- Delay Range:', `${config.minDelayMs/1000} - ${config.maxDelayMs/1000} seconds`);
        console.log('- Fee per TX:', formatAmount(config.fee.amount[0].amount), 'EMPE');
        console.log('- Destination Mode:', destMode === 'random' ? 'Random addresses' : 'Self address');
        
        // Confirm before proceeding
        const confirm = await askQuestion('\nProceed with these settings? (y/n)', 'y');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Operation cancelled.');
            process.exit(0);
        }

        // Validate private key
        if (!process.env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in .env file');
        }

        console.log('🔑 Loading wallet...');
        const privateKey = new Uint8Array(process.env.PRIVATE_KEY.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, 'empe');
        const [account] = await wallet.getAccounts();
        
        console.log(`👤 Sender address: ${account.address}`);
        
        // Create client with detailed logging
        console.log('🔌 Connecting to network...');
        const client = await SigningStargateClient.connectWithSigner(config.rpcEndpoint, wallet, {
            gasPrice: { denom: config.denom, amount: '0.01' }
        });
        
        // Check balance first
        console.log('💰 Checking balance...');
        const balance = await client.getBalance(account.address, config.denom);
        const balanceAmount = parseInt(balance.amount);
        console.log(`   Current balance: ${(balanceAmount / 1e6).toFixed(6)} ${config.denom}`);
        
        // Calculate estimated total cost
        const estimatedCost = config.txCount * (config.maxAmount + parseInt(config.fee.amount[0].amount));
        if (balanceAmount < estimatedCost) {
            throw new Error(`Insufficient balance. Need at least ${estimatedCost/1e6} ${config.denom} for ${config.txCount} transactions`);
        }

        console.log(`\n📊 Transaction Plan:`);
        console.log(`- Number of TXs: ${config.txCount}`);
        console.log(`- Amount Range: ${(config.minAmount/1e6).toFixed(6)} - ${(config.maxAmount/1e6).toFixed(6)} ${config.denom}`);
        console.log(`- Delay Range: ${config.minDelayMs/1000} - ${config.maxDelayMs/1000} seconds`);
        console.log(`- Fee per TX: ${(parseInt(config.fee.amount[0].amount)/1e6).toFixed(6)} ${config.denom}`);
        console.log(`- Destination Mode: ${destMode === 'random' ? 'Random addresses' : 'Self address'}`);
        
        console.log('\n🚀 Starting transactions...');
        
        let successfulTxs = 0;
        let totalSent = 0;
        
        for (let i = 1; i <= config.txCount; i++) {
            const amount = randomInt(config.minAmount, config.maxAmount);
            const delay = randomInt(config.minDelayMs, config.maxDelayMs);
            
            // Determine destination address
            let toAddress = account.address;
            if (destMode === 'random') {
                try {
                    const randPk = randomBytes(32);
                    const randWallet = await DirectSecp256k1Wallet.fromKey(randPk, 'empe');
                    const [randAcc] = await randWallet.getAccounts();
                    toAddress = randAcc.address;
                } catch (e) {
                    console.warn('⚠️ Failed to generate random address, falling back to self. Reason:', e.message);
                    toAddress = account.address;
                }
            }
            
            console.log(`\n🔄 TX ${i}/${config.txCount}: Sending ${(amount/1e6).toFixed(6)} ${config.denom} to ${toAddress}`);
            console.log(`   Waiting ${(delay/1000).toFixed(1)} seconds before sending...`);
            
            // Add delay between transactions
            await sleep(delay);
            
            try {
                const result = await client.sendTokens(
                    account.address,
                    toAddress,
                    [{ denom: config.denom, amount: amount.toString() }],
                    config.fee,
                    `${config.memo}-${i}`
                );
                
                if (result.code === 0) {
                    successfulTxs++;
                    totalSent += amount;
                    console.log(`✅ TX ${i} successful!`);
                    console.log(`   Tx Hash: ${result.transactionHash}`);
                } else {
                    console.error(`❌ TX ${i} failed with code ${result.code}:`);
                    console.error(JSON.stringify(result.rawLog, null, 2));
                }
            } catch (error) {
                console.error(`❌ TX ${i} failed with error:`);
                console.error(error.message);
                if (error.response) {
                    console.error('Response data:', error.response.data);
                }
            }
            
            // Small delay between error and next TX
            if (i < config.txCount) {
                await sleep(1000);
            }
        }
        
        // Final summary
        console.log('\n📊 Transaction Summary:');
        console.log(`✅ Successful: ${successfulTxs}/${config.txCount} (${(successfulTxs/config.txCount*100).toFixed(1)}%)`);
        console.log(`💰 Total sent: ${(totalSent/1e6).toFixed(6)} ${config.denom}`);
        
        // Show final balance
        if (successfulTxs > 0) {
            const finalBalance = await client.getBalance(account.address, config.denom);
            console.log(`\n💵 Final balance: ${(parseInt(finalBalance.amount)/1e6).toFixed(6)} ${config.denom}`);
        }
        
    } catch (error) {
        console.error('\n❌ Error:');
        console.error(error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    } finally {
        readline.close();
    }
}

// Run the script
main().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    readline.close();
    process.exit(1);
});
