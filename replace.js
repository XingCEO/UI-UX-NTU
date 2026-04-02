const fs = require('fs');

const path = 'css/style.css';
let content = fs.readFileSync(path, 'utf8');

// Replacements
content = content.replace(/color: rgba\(13, 17, 23,0\.7\);/g, 'color: rgba(241, 245, 249, 0.9);');
content = content.replace(/color: rgba\(13, 17, 23,0\.8\);/g, 'color: rgba(241, 245, 249, 1);');

content = content.replace(/\.card--highlight \{\n\s*border-color: var\(--accent\);\n\s*background: var\(--accent-light\);\n\}/g, '.card--highlight {\n  border-color: var(--accent);\n  background: #161B26;\n}');
content = content.replace(/\.about-mv-card \{\n\s*background: var\(--accent-light\);\n\s*border-radius: var\(--radius-lg\);\n\s*padding: 1\.75rem;/g, '.about-mv-card {\n  background: #161B26;\n  border-radius: var(--radius-lg);\n  padding: 1.75rem;');
content = content.replace(/\.prose \.highlight-box \{\n\s*background: var\(--accent-light\);\n\s*border-left: 3px solid var\(--accent\);/g, '.prose .highlight-box {\n  background: #161B26;\n  border-left: 3px solid var(--accent);');

content = content.replace(/background: linear-gradient\(145deg, #faf8f5 0%, var\(--bg\) 35%, #fde8d8 75%, #f9d4bc 100%\);/gi, 'background: linear-gradient(145deg, #161B26 0%, var(--bg) 35%, rgba(232,119,46,0.08) 75%, rgba(232,119,46,0.15) 100%);');

// Update opacities
const opacitiesToReplace = [
  ['opacity: 0.3;', 'opacity: 0.65;'],
  ['opacity: 0.35;', 'opacity: 0.7;'],
  ['opacity: 0.4;', 'opacity: 0.7;'],
  ['opacity: 0.45;', 'opacity: 0.7;'],
  ['color: rgba(241, 245, 249,0.45);', 'color: rgba(241, 245, 249,0.7);'],
  ['color: rgba(241, 245, 249,0.5);', 'color: rgba(241, 245, 249,0.7);'],
  ['color: rgba(241, 245, 249,0.4);', 'color: rgba(241, 245, 249,0.7);'],
  ['color: rgba(232, 119, 46, 0.35);', 'color: rgba(232, 119, 46, 0.65);'],
  ['color: rgba(232,119,46,0.3);', 'color: rgba(232, 119, 46, 0.6);'],
  ['color: rgba(45, 111, 232, 0.45);', 'color: rgba(45, 111, 232, 0.7);']
];

for (const [oldVal, newVal] of opacitiesToReplace) {
  content = content.split(oldVal).join(newVal);
}

fs.writeFileSync(path, content);
console.log('CSS Replaced successfully');

const advPath = 'advertiser-inquiry.html';
let advContent = fs.readFileSync(advPath, 'utf8');

advContent = advContent.replace(/\.chip\.status-active \{\s*background: var\(--accent\);\s*color: #94A3B8;\s*\}/, '.chip.status-active {\n      background: var(--accent);\n      color: #F1F5F9;\n    }');
advContent = advContent.replace(/\.chip\.status-completed \{\s*background: #E8D4BC;\s*color: #F1F5F9;\s*\}/, '.chip.status-completed {\n      background: rgba(232, 119, 46, 0.07);\n      color: var(--accent);\n    }');

fs.writeFileSync(advPath, advContent);
console.log('HTML Replaced successfully');
