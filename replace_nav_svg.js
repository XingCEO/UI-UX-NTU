const fs = require('fs');
const path = require('path');

const newNavSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 35 480 145" height="44" width="auto">
  <defs>
    <linearGradient id="lw" x1="0%" y1="20%" x2="80%" y2="100%"><stop offset="0%" stop-color="#E8772E"/><stop offset="100%" stop-color="#C05E1C"/></linearGradient>
    <linearGradient id="lc" x1="100%" y1="0%" x2="20%" y2="100%"><stop offset="0%" stop-color="#2D6FE8"/><stop offset="100%" stop-color="#1B4FBF"/></linearGradient>
  </defs>
  <circle cx="82" cy="100" r="62" fill="none" stroke="url(#lw)" stroke-width="8"/>
  <circle cx="120" cy="100" r="62" fill="none" stroke="url(#lc)" stroke-width="8"/>
  <circle cx="100" cy="100" r="10" fill="#C05E1C" opacity="0.15"/>
  <circle cx="100" cy="100" r="5" fill="#111117"/>
  <circle cx="100" cy="100" r="17" fill="none" stroke="#111117" stroke-width="1.5" opacity="0.15"/>
  <text x="210" y="94" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="64" font-weight="900" fill="#111117" letter-spacing="1">ABOT</text>
  <text x="210" y="152" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="64" font-weight="900" fill="#111117" letter-spacing="1">KAMAY</text>
  <text x="213" y="174" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="14" font-weight="700" fill="#C05E1C" letter-spacing="8">WITHIN REACH</text>
</svg>`;

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  const navRegex = /<a href="\/index\.html" class="nav-logo"[^>]*>[\s\S]*?<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 600 200" height="64"[^>]*>[\s\S]*?<\/svg>[\s\S]*?<\/a>/;
  
  if(navRegex.test(content)) {
    content = content.replace(navRegex, `<a href="/index.html" class="nav-logo" aria-label="Abot Kamay WiFi Home">\n        ${newNavSvg}\n      </a>`);
    fs.writeFileSync(file, content);
    console.log('Replaced nav svg in ' + file);
  } else {
    console.log('Nav SVG not found in ' + file);
  }
});
