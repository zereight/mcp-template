// create_mcp_server.js

// Use import instead of require for ES modules
import fs from 'fs'; // Use sync fs for createReadStream if needed
import fsPromises from 'fs/promises'; // Keep async promises version
import path from 'path';
import { exec } from 'child_process';
import readline from 'readline';
import process from 'process';

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

// Utility function to convert a string to PascalCase (defined inline)
export function toPascalCase(str) {
  if (!str) return ''; // Handle empty or null input

  // Check if the string contains separators
  if (!str.includes('-') && !str.includes('_')) {
    // No separators: capitalize first letter, keep the rest as is
    return str.charAt(0).toUpperCase() + str.slice(1);
  } else {
    // Separators found: split, capitalize first letter, lowercase rest, join
    return str
      .split(/[-_]/) // Split by hyphen or underscore
      .filter(part => part.length > 0) // Remove empty strings resulting from leading/trailing/double separators
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()) // Capitalize first letter, lowercase rest
      .join(''); // Join parts back together
  }
}

function generateServerSkeleton(serverName) {
  // Convert serverName to PascalCase for the class name using the utility function
  const className = toPascalCase(serverName);

  return `#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

class ${className} {
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

const server = new ${className}();
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
  // Use the original serverName (not sanitized yet) for generating the skeleton
  const serverSkeleton = generateServerSkeleton(serverName);

  // Sanitize serverName for directory and package.json naming (allow hyphens/underscores)
  const sanitizedServerNameForPaths = serverName.replace(/[^a-zA-Z0-9-_]/g, '');
  // Sanitize serverName for package.json name field (lowercase, no special chars except hyphen maybe)
  const sanitizedServerNameForPackage = serverName.toLowerCase().replace(/[^a-z0-9-]/g, '');

  try {
    await fsPromises.writeFile(indexPath, serverSkeleton, 'utf-8');
    console.log('src/index.ts file created.');
  } catch (error) {
    console.error('Error creating src/index.ts file:', error);
    return;
  }

  const packageJsonPath = path.join(serverDir, 'package.json');
  const packageJson = {
    "name": sanitizedServerNameForPackage,
    "version": "1.0.0",
    "description": "MCP server",
    "license": "MIT",
    "author": "",
    "type": "module",
    "private": false,
      // Use sanitized name for bin entry too
      [sanitizedServerNameForPaths.toLowerCase()]: "build/index.js",
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
      "@modelcontextprotocol/sdk": "1.8.0",
      "@types/node-fetch": "^2.6.12",
      "node-fetch": "^3.3.2",
      "zod-to-json-schema": "^3.23.5"
    },
    "devDependencies": {
      "@types/node": "^22.13.10",
      "typescript": "^5.8.2",
      "zod": "^3.24.2"
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

  // Create .gitignore file
  const gitignorePath = path.join(serverDir, '.gitignore');
  const gitignoreContent = `# Dependency directories
node_modules/

# Build output
build/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Diagnostic reports (https://nodejs.org/api/report.html)
report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# dotenv environment variables file
.env*
!.env.example
`;
  try {
    await fsPromises.writeFile(gitignorePath, gitignoreContent, 'utf-8');
    console.log('.gitignore file created.');
  } catch (error) {
    console.error('Error creating .gitignore file:', error);
    // No return here, as it's not critical like tsconfig or package.json
  }

  console.log(`\n서버 프로젝트가 ${serverDir}에 생성되었습니다.`);
  console.log(`\n이 디렉토리로 이동 후 다음 명령어를 실행하세요:`);
  console.log(`cd ${serverDir}`);
  console.log(`npm run build`);
  console.log(`npm start`);
  rl.close();
}

createMcpServer();