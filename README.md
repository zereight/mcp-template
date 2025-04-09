# MCP Server Template Generator

This repository contains a simple Node.js script (`create_mcp_server.js`) to generate the basic structure for a Model Context Protocol (MCP) server project.

## Features

*   Creates a standard MCP server directory structure (`src`, `build`).
*   Generates a basic TypeScript configuration (`tsconfig.json`).
*   Generates a basic `package.json` including the necessary `@modelcontextprotocol/sdk` dependency.
*   Creates a skeleton server code (`src/index.ts`) with a simple 'hello' tool example.
*   Automatically installs project dependencies (`npm install`).

## How to Use (Using `curl`)

### 1. Download the Script and Run

This method downloads the script first and then executes it locally. You can do this in two steps or combine them with `&&`.

**Option A: Two Steps**

```bash
# Step 1: Download the script (saves to the current directory)
curl -fsSL https://raw.githubusercontent.com/zereight/mcp-template/main/create_mcp_server.js -o create_mcp_server.js

# Step 2: Execute the script (specify target directory)
node ./create_mcp_server.js [target_directory_path]

# Step 2: Or execute without path (creates project in current directory)
node ./create_mcp_server.js
```

**Option B: Combined Command (`&&`)**

```bash
# Download and execute immediately (specify target directory)
curl -fsSL https://raw.githubusercontent.com/zereight/mcp-template/main/create_mcp_server.js -o create_mcp_server.js && node ./create_mcp_server.js [target_directory_path]

# Download and execute immediately (creates project in current directory)
curl -fsSL https://raw.githubusercontent.com/zereight/mcp-template/main/create_mcp_server.js -o create_mcp_server.js && node ./create_mcp_server.js
```

*   `[target_directory_path]` is optional. If omitted in either method, the server project will be created in the directory where the script is located/downloaded.
*   When the script runs, it will prompt you to enter the server name, execution command, arguments, and environment variables.

### After Execution

Once the script finishes, an MCP server project folder will be created at the specified path. Navigate into the folder and run the following commands:

```bash
cd <generated_server_project_folder>
npm run build
npm start
```

## Script Inputs

The script will prompt you for the following information during execution:

*   **MCP Server Name:** The name for the project folder and for internal use.
*   **Execution Command:** The command to run the server (e.g., `node`).
*   **Arguments:** Arguments to pass to the execution command (comma-separated, e.g., `--version, -y`).
*   **Environment Variables:** Environment variables to set when running the server (key=value, comma-separated, e.g., `API_KEY=nEBjsd,DATA=asnd`). 