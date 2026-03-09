const fs = require('fs');
const path = require('path');

const variants = ['1', '2', '3', '4', '5'];
const pages = ['pricing', 'docs', 'account', 'download'];

for (const v of variants) {
  for (const p of pages) {
    const dir = path.join(process.cwd(), 'src', 'app', v, p);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const componentName = p.charAt(0).toUpperCase() + p.slice(1) + 'Content';
    
    const content = `"use client";
import { ${componentName} } from "@/components/subpages/${componentName}";

export default function Page() {
  return <${componentName} variant="${v}" />;
}
`;
    fs.writeFileSync(path.join(dir, 'page.tsx'), content);
  }
}
console.log('Pages generated correctly!');
