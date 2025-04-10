// create_mcp_server.js

const fs = require('fs'); // Use sync fs for createReadStream if needed
const fsPromises = require('fs').promises; // Keep async promises version
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Determine the input stream based on whether stdin is a TTY
const inputStream = process.stdin.isTTY ? process.stdin : fs.createReadStream('/dev/tty');

const rl = readline.createInterface({
  input: inputStream, // Use the determined input stream
  output: process.stdout,
});

const mcpServersDir = process.cwd();

function askQuestion(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => { // Use rl instead of readline directly
      resolve(answer);
    });
  });
}

function generateServerSkeleton(serverName) {
  return `#!/usr/bin/env node
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
  // 커맨드 라인 인자에서 디렉토리 경로 가져오기 (node create_mcp_server.js <directory>)
  const targetDirectoryArg = process.argv[2];
  // 인자가 없으면 스크립트 파일이 있는 디렉토리 사용, 있으면 해당 경로 사용
  const baseDirectory = targetDirectoryArg ? path.resolve(targetDirectoryArg) : path.dirname(process.argv[1]);

  const serverName = await askQuestion('MCP 서버 이름: ');
  const command = await askQuestion('실행 명령어 (예: node): ');
  const argsString = await askQuestion('인수 (쉼표로 구분, 예: --version, -y): ');
  const args = argsString.split(',').map(arg => arg.trim());
  const envString = await askQuestion('환경 변수 (key=value, 쉼표로 구분, 예: API_KEY=nEBjsd,DATA=asnd): ');
  const envPairs = envString.split(',').map(pair => pair.trim());
  const env = {};
  envPairs.forEach(pair => {
    const [key, value] = pair.split('=').map(item => item.trim());
    if (key && value) {
      env[key] = value;
    }
  });

  const serverDir = path.join(baseDirectory, serverName);
  const srcDir = path.join(serverDir, 'src');
  try {
    await fsPromises.mkdir(srcDir, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
    return;
  }

  const indexPath = path.join(srcDir, 'index.ts');
  const sanitizedServerName = serverName.replace(/[^a-zA-Z0-9-_]/g, '');
  const serverSkeleton = generateServerSkeleton(sanitizedServerName);
  try {
    await fsPromises.writeFile(indexPath, serverSkeleton, 'utf-8');
    console.log('src/index.ts file created.');
  } catch (error) {
    console.error('Error creating src/index.ts file:', error);
    return;
  }

  const packageJsonPath = path.join(serverDir, 'package.json');
  const packageJson = {
    "name": sanitizedServerName.toLowerCase(),
    "version": "1.0.0",
    "description": "MCP server",
    "license": "MIT",
    "author": "",
    "type": "module",
    "private": false,
      [serverName.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase()]: "build/index.js",
      [serverName]: "build/index.js",
    "files": [
      "build"
    ],
    "publishConfig": {
      "access": "public"
    },
    "engines": {
      "node": ">=14"
    },
    "scripts": {
      "build": "tsc && node -e \"require('fs').chmodSync('build/index.js', '755')\"",
      "watch": "tsc --watch",
      "inspector": "npx @modelcontextprotocol/inspector build/index.js",
      "start": "node build/index.js"
    },
    "dependencies": {
      "@modelcontextprotocol/sdk": "latest",
      "axios": "^1.7.9",
      "mcp-framework": "^0.1.12",
      "okhttp": "^1.1.0"
    },
    "devDependencies": {
      "@types/node": "^20.11.24",
      "typescript": "^5.7.2"
    }
  };

  try {
    await fsPromises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
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

  const tsconfigPath = path.join(serverDir, 'tsconfig.json');
  const tsconfig = {
    "compilerOptions": {
      "target": "ES2022",
      "module": "Node16",
      "moduleResolution": "Node16",
      "outDir": "./build",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules"]
  };

  try {
    await fsPromises.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf-8');
    console.log('tsconfig.json file created.');
  } catch (error) {
    console.error('Error creating tsconfig.json:', error);
    return;
  }

  console.log(`\n서버 프로젝트가 ${serverDir}에 생성되었습니다.`);
  console.log(`\n이 디렉토리로 이동 후 다음 명령어를 실행하세요:`);
  console.log(`cd ${serverDir}`);
  console.log(`npm run build`);
  console.log(`npm start`);
  rl.close();
}

createMcpServer();