const http = require('http');
const { URL } = require('url');

const BASE_URL = process.env.LEVIATHAN_BACKEND_URL || 'http://localhost:3001';

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          resolve({ status: res.statusCode, body: json });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function usage() {
  console.log('\nUsage: node examples/infrastructureClient.js <command> [args]');
  console.log('Commands:');
  console.log('  status');
  console.log('  oracle <symbol>');
  console.log('  topic <name>');
  console.log('  subscribe <topic>');
  console.log('  storage-upload <filePath>');
  console.log('  storage-pinata <filePath>');
  console.log('  thirdweb <contractType> <jsonParams>');
  console.log('  chainlink <pair>');
  console.log('  gnosis-safe <commaSeparatedSigners> [threshold]');
  console.log('  molecule-ipnft <jsonMetadata>');
  console.log('  humantech-proof <jsonIdentityData>');
  console.log('\nExamples:');
  console.log('  node examples/infrastructureClient.js status');
  console.log('  node examples/infrastructureClient.js oracle KONT');
  console.log('  node examples/infrastructureClient.js topic metrics');
  console.log('  node examples/infrastructureClient.js subscribe /kont/metrics/1.0.0');
  console.log('  node examples/infrastructureClient.js storage-upload ./data/genome.json');
  console.log('  node examples/infrastructureClient.js thirdweb token "{\"name\":\"KONT\",\"symbol\":\"KONT\"}"');
  console.log('  node examples/infrastructureClient.js chainlink KONT/USD');
  console.log('  node examples/infrastructureClient.js gnosis-safe 0xabc,0xdef 2');
  console.log('  node examples/infrastructureClient.js humantech-proof "{\"user\":\"alice\"}"');
}

async function fetchStatus() {
  const response = await apiRequest('/api/infrastructure/status');
  console.log('Infrastructure status:', JSON.stringify(response.body, null, 2));
}

async function fetchOracle(symbol) {
  const response = await apiRequest(`/api/infrastructure/oracle/${encodeURIComponent(symbol)}`);
  console.log(`Oracle price for ${symbol}:`, JSON.stringify(response.body, null, 2));
}

async function fetchTopic(name) {
  const response = await apiRequest(`/api/infrastructure/p2p/topic/${encodeURIComponent(name)}`);
  console.log(`P2P topic for ${name}:`, JSON.stringify(response.body, null, 2));
}

async function subscribeTopic(topic) {
  const response = await apiRequest('/api/infrastructure/p2p/subscribe', 'POST', { topic });
  console.log(`Subscribe response for ${topic}:`, JSON.stringify(response.body, null, 2));
}

async function main() {
  const command = process.argv[2];

  if (!command) {
    usage();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'status':
        await fetchStatus();
        break;
      case 'oracle': {
        const symbol = process.argv[3];
        if (!symbol) {
          throw new Error('oracle command requires a symbol argument');
        }
        await fetchOracle(symbol);
        break;
      }
      case 'topic': {
        const name = process.argv[3];
        if (!name) {
          throw new Error('topic command requires a name argument');
        }
        await fetchTopic(name);
        break;
      }
      case 'subscribe': {
        const topic = process.argv[3];
        if (!topic) {
          throw new Error('subscribe command requires a topic argument');
        }
        await subscribeTopic(topic);
        console.log('If a WebSocket client is connected to the backend, it will receive forwarded messages on P2P_MESSAGE.');
        break;
      }
      case 'storage-upload': {
        const filePath = process.argv[3];
        if (!filePath) {
          throw new Error('storage-upload command requires a filePath argument');
        }
        const response = await apiRequest('/api/infrastructure/integration/storage/upload', 'POST', { filePath });
        console.log('Storage upload simulation:', JSON.stringify(response.body, null, 2));
        break;
      }
      case 'storage-pinata': {
        const filePath = process.argv[3];
        if (!filePath) {
          throw new Error('storage-pinata command requires a filePath argument');
        }
        const response = await apiRequest('/api/infrastructure/integration/storage/pinata', 'POST', { filePath });
        console.log('Pinata pin simulation:', JSON.stringify(response.body, null, 2));
        break;
      }
      case 'thirdweb': {
        const contractType = process.argv[3];
        const paramsJson = process.argv[4] || '{}';
        if (!contractType) {
          throw new Error('thirdweb command requires a contractType argument');
        }
        const params = JSON.parse(paramsJson);
        const response = await apiRequest('/api/infrastructure/integration/thirdweb/deploy', 'POST', { contractType, params });
        console.log('Thirdweb deployment template:', JSON.stringify(response.body, null, 2));
        break;
      }
      case 'chainlink': {
        const pair = process.argv[3];
        if (!pair) {
          throw new Error('chainlink command requires a pair argument');
        }
        const response = await apiRequest(`/api/infrastructure/integration/chainlink/${encodeURIComponent(pair)}`);
        console.log('Chainlink price simulation:', JSON.stringify(response.body, null, 2));
        break;
      }
      case 'gnosis-safe': {
        const signersString = process.argv[3];
        const thresholdArg = process.argv[4];
        if (!signersString) {
          throw new Error('gnosis-safe command requires a comma-separated signers argument');
        }
        const signers = signersString.split(',').map((item) => item.trim()).filter(Boolean);
        const threshold = thresholdArg ? parseInt(thresholdArg, 10) : undefined;
        const response = await apiRequest('/api/infrastructure/integration/gnosis/safe', 'POST', { signers, threshold });
        console.log('Gnosis Safe config simulation:', JSON.stringify(response.body, null, 2));
        break;
      }
      case 'molecule-ipnft': {
        const metadataJson = process.argv[3] || '{}';
        const metadata = JSON.parse(metadataJson);
        const response = await apiRequest('/api/infrastructure/integration/molecule/ipnft', 'POST', { metadata });
        console.log('Molecule IP-NFT simulation:', JSON.stringify(response.body, null, 2));
        break;
      }
      case 'humantech-proof': {
        const identityJson = process.argv[3] || '{}';
        const identityData = JSON.parse(identityJson);
        const response = await apiRequest('/api/infrastructure/integration/humantech/proof', 'POST', { identityData });
        console.log('human.tech proof simulation:', JSON.stringify(response.body, null, 2));
        break;
      }
      default:
        usage();
        process.exit(0);
    }
  } catch (error) {
    console.error('Error calling Leviathan infrastructure API:', error.message || error);
    process.exit(1);
  }
}

main();
