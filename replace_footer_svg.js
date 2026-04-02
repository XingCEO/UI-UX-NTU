const fs = require('fs');
const path = require('path');

const newFooterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 35 480 145" height="56" width="auto">
  <defs>
    <linearGradient id="ak-warm" x1="0%" y1="20%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#F5923A"/>
      <stop offset="40%" stop-color="#E8772E"/>
      <stop offset="100%" stop-color="#C05E1C"/>
    </linearGradient>
    <linearGradient id="ak-cool" x1="100%" y1="0%" x2="20%" y2="100%">
      <stop offset="0%" stop-color="#5B9BF5"/>
      <stop offset="40%" stop-color="#2D6FE8"/>
      <stop offset="100%" stop-color="#1B4FBF"/>
    </linearGradient>
    <radialGradient id="ak-beacon" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="#E0E7FF" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#B4C6EE" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ak-clip"><circle cx="120" cy="100" r="62"/></clipPath>
    <filter id="ak-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="b"/>
      <feComposite in="SourceGraphic" in2="b" operator="over"/>
    </filter>
  </defs>
  <circle cx="82" cy="100" r="62" fill="none" stroke="url(#ak-warm)" stroke-width="8"/>
  <circle cx="120" cy="100" r="62" fill="none" stroke="url(#ak-cool)" stroke-width="8"/>
  <circle cx="100" cy="100" r="18" fill="url(#ak-beacon)" filter="url(#ak-glow)" opacity="0.5"/>
  <circle cx="100" cy="100" r="10" fill="url(#ak-beacon)"/>
  <circle cx="100" cy="100" r="5" fill="#FFFFFF"/>
  <circle cx="100" cy="100" r="17" fill="none" stroke="#FFF" stroke-width="1.5" opacity="0.18"/>
  
  <text x="210" y="94" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="64" font-weight="900" fill="#FFF" letter-spacing="1">ABOT</text>
  <text x="210" y="152" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="64" font-weight="900" fill="#FFF" letter-spacing="1">KAMAY</text>
  <text x="213" y="174" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="14" font-weight="700" fill="#F5923A" letter-spacing="8">WITHIN REACH</text>
</svg>`;

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  const footerRegex = /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 600 200" height="72"[^>]*>[\s\S]*?<\/svg>/;
  
  if(footerRegex.test(content)) {
    content = content.replace(footerRegex, newFooterSvg);
    fs.writeFileSync(file, content);
    console.log('Replaced footer svg in ' + file);
  } else {
    console.log('Footer SVG not found in ' + file);
  }
});
