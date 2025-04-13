# MCP Server Template Generator

This repository contains a simple Node.js script (`create_mcp_server.js`) to generate the basic structure for a Model Context Protocol (MCP) server project.

## Features

*   Creates a standard MCP server directory structure (`src`, `build`).
*   Generates a basic TypeScript configuration (`tsconfig.json`).
*   Generates a basic `package.json` including the necessary `@modelcontextprotocol/sdk` dependency.
*   Creates a skeleton server code (`src/index.ts`) with a simple 'hello' tool example.
*   Automatically installs project dependencies (`npm install`).
*   Generates a `.gitignore` file.

## How to Use

Run the following command in your terminal. This will download the script and execute it immediately:

```bash
curl -fsSL https://raw.githubusercontent.com/zereight/mcp-template/main/create_mcp_server.js -o create_mcp_server.js && node ./create_mcp_server.js [target_directory_path]
```

*   `[target_directory_path]` is optional. If provided, the MCP server project will be created in that directory. If omitted, it will be created in the current directory.
*   The script will prompt you for the server name and other configuration details.

## After Execution

Once the script finishes, navigate into the newly created project folder:

```bash
cd <generated_server_project_folder>
```

Then, build and start your MCP server:

```bash
npm run build
npm start
```

## Script Inputs

The script will prompt you for the following information during execution:

*   **MCP Server Name:** The name for the project folder and for internal use.
*   **Execution Command:** The command to run the server (e.g., `node`).
*   **Arguments:** Arguments to pass to the execution command (comma-separated, e.g., `--version, -y`).
*   **Environment Variables:** Environment variables to set when running the server (key=value, comma-separated, e.g., `API_KEY=nEBjsd,DATA=asnd`). 