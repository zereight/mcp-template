// create_mcp_server.js

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

const mcpServersDir = process.cwd();

function askQuestion(query) {
  return new Promise((resolve) => {
    readline.question(query, (answer) => {
      resolve(answer);
    });
  });
}

function generateServerSkeleton(serverName) {
  return `
// 필요한 모듈 import
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

class ${serverName} {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '${serverName}',
        version: '1.0.0'
      },
      {
        capabilities: {
          resources: {},
          tools: {}
        }
      }
    );

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[${serverName} Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'hello',
          description: 'Say hello',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Your name' }
            },
            required: ['name']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'hello') {
        const name = request.params.arguments?.name;
        return { content: [{ type: 'text', text: \`Hello, \${name}!\` }] };
      }
      throw new McpError(ErrorCode.MethodNotFound, \`Unknown tool: \${request.params.name}\`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('${serverName} running on stdio');
  }
}

const server = new ${serverName}();
server.run().catch(console.error);
  `;
}

async function createMcpServer() {
  const serverName = await askQuestion('MCP 서버 이름: ');
  const command = await askQuestion('실행 명령어 (예: node): ');
  const argsString = await askQuestion('인수 (쉼표로 구분): ');
  const args = argsString.split(',').map(arg => arg.trim());
  const envString = await askQuestion('환경 변수 (key=value, 쉼표로 구분): ');
  const envPairs = envString.split(',').map(pair => pair.trim());
  const env = {};
  envPairs.forEach(pair => {
    const [key, value] = pair.split('=').map(item => item.trim());
    if (key && value) {
      env[key] = value;
    }
  });

  const serverDir = path.join(mcpServersDir, serverName);
  try {
    await fs.mkdir(serverDir, { recursive: true });
  } catch (error) {
    console.error('Error creating server directory:', error);
    return;
  }

  const indexPath = path.join(serverDir, 'index.ts');
  const serverSkeleton = generateServerSkeleton(serverName.replace(/[^a-zA-Z0-9]/g, ''));
  try {
    await fs.writeFile(indexPath, serverSkeleton, 'utf-8');
    console.log('index.ts file created.');
  } catch (error) {
    console.error('Error creating index.ts file:', error);
    return;
  }

  const packageJsonPath = path.join(serverDir, 'package.json');
  const packageJson = {
    name: serverName,
    version: '1.0.0',
    description: 'MCP server',
    main: 'build/index.js',
    type: 'module',
    scripts: {
      build: 'tsc',
      start: 'node build/index.js'
    },
    dependencies: {
      "@modelcontextprotocol/sdk": "latest"
    },
    devDependencies: {
      "typescript": "^5.0.0"
    }
  };

  try {
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
    console.log('package.json file created.');

    console.log('Installing dependencies...');
    await new Promise((resolve, reject) => {
      exec('npm install', { cwd: serverDir }, (error, stdout, stderr) => {
        if (error) {
          console.error(`npm install error: ${stderr}`);
          reject(error);
          return;
        }
        console.log(stdout);
        resolve(stdout);
      });
    });
    console.log('Dependencies installed.');
  } catch (error) {
    console.error('Error creating package.json or installing dependencies:', error);
    return;
  }

  console.log(`\n서버 프로젝트가 ${serverDir}에 생성되었습니다.`);
  console.log(`\n이 디렉토리로 이동 후 다음 명령어를 실행하세요:`);
  console.log(`cd ${serverDir}`);
  console.log(`npm run build`);
  console.log(`npm start`);
  readline.close();
}

createMcpServer();