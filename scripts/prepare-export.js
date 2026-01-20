import fs from 'fs';
import path from 'path';

const exportDir = path.join(process.cwd(), 'export');
const distDir = path.join(process.cwd(), 'dist');

// Create export directory
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

// Copy compiled files
fs.cpSync(distDir, path.join(exportDir, 'dist'), { recursive: true });

// Copy package files
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Prepare production package.json
const prodPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  private: true,
  scripts: {
    start: packageJson.scripts.start
  },
  dependencies: packageJson.dependencies
};

fs.writeFileSync(
  path.join(exportDir, 'package.json'),
  JSON.stringify(prodPackageJson, null, 2)
);

// Copy environment example
fs.copyFileSync('.env.example', path.join(exportDir, '.env.example'));

// Create README
const readmeContent = `# ${packageJson.name}

## Setup
1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure environment:
   - Copy \`.env.example\` to \`.env\`
   - Update the environment variables

3. Start the server:
   \`\`\`bash
   npm start
   \`\`\`

## Environment Variables
- \`PORT\`: Server port (default: 5001)
- \`MONGODB_URI\`: MongoDB connection string
- \`JWT_SECRET\`: Secret for JWT tokens
`;

fs.writeFileSync(path.join(exportDir, 'README.md'), readmeContent);

console.log('Backend export prepared in /export directory');