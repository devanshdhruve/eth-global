import { Client } from '@hashgraph/sdk';
console.log('✅ @hashgraph/sdk works');

import { ChatPromptTemplate } from '@langchain/core/prompts';
console.log('✅ @langchain/core works');

import { AgentExecutor } from 'langchain/agents';
console.log('✅ langchain works');

// This might fail if hedera-agent-kit isn't properly installed
try {
  const hak = require('hedera-agent-kit');
  console.log('✅ hedera-agent-kit works');
} catch (e) {
  console.error('❌ hedera-agent-kit failed:', e.message);
}
