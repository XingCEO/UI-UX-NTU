import os
import glob
import re

light_logo = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" height="32" width="auto">
      <defs>
        <linearGradient id="lw" x1="0%" y1="20%" x2="80%" y2="100%"><stop offset="0%" stop-color="#E8772E"/><stop offset="100%" stop-color="#C05E1C"/></linearGradient>
        <linearGradient id="lc" x1="100%" y1="0%" x2="20%" y2="100%"><stop offset="0%" stop-color="#2D6FE8"/><stop offset="100%" stop-color="#1B4FBF"/></linearGradient>
      </defs>
      <circle cx="82" cy="100" r="62" fill="none" stroke="url(#lw)" stroke-width="5.5"/>
      <circle cx="120" cy="100" r="62" fill="none" stroke="url(#lc)" stroke-width="5.5"/>
      <circle cx="100" cy="100" r="10" fill="#C05E1C" opacity="0.15"/>
      <circle cx="100" cy="100" r="5" fill="#111117"/>
      <circle cx="100" cy="100" r="17" fill="none" stroke="#111117" stroke-width="0.8" opacity="0.1"/>
      <text x="210" y="78" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="58" font-weight="900" fill="#111117" letter-spacing="2">ABOT</text>
      <text x="210" y="138" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="58" font-weight="900" fill="#111117" letter-spacing="2">KAMAY</text>
      <text x="213" y="164" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="12" font-weight="600" fill="#C05E1C" letter-spacing="10">WITHIN REACH</text>
    </svg>"""

dark_logo = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" height="36" width="auto">
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
      <circle cx="82" cy="100" r="62" fill="none" stroke="url(#ak-warm)" stroke-width="5.5"/>
      <circle cx="120" cy="100" r="62" fill="none" stroke="url(#ak-cool)" stroke-width="5.5"/>
      <circle cx="100" cy="100" r="18" fill="url(#ak-beacon)" filter="url(#ak-glow)" opacity="0.5"/>
      <circle cx="100" cy="100" r="10" fill="url(#ak-beacon)"/>
      <circle cx="100" cy="100" r="5" fill="#FFFFFF"/>
      <circle cx="100" cy="100" r="17" fill="none" stroke="#FFF" stroke-width="1" opacity="0.18"/>
      <circle cx="100" cy="100" r="26" fill="none" stroke="#FFF" stroke-width="0.7" opacity="0.08"/>
      <text x="210" y="78" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="58" font-weight="900" fill="#FAFAFA" letter-spacing="2">ABOT</text>
      <text x="210" y="138" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="58" font-weight="900" fill="#FAFAFA" letter-spacing="2">KAMAY</text>
      <text x="213" y="164" font-family="'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif" font-size="12" font-weight="600" fill="#E8772E" letter-spacing="10">WITHIN REACH</text>
    </svg>"""

nav_logo_pattern = re.compile(r'(<a[^>]*class="nav-logo"[^>]*>)\s*<div class="nav-logo-mark".*?</svg>\s*</div>\s*Abot Kamay\s*</a>', re.DOTALL)

footer_logo_pattern = re.compile(r'(<div class="footer-brand-name">)\s*<svg.*?</svg>\s*Abot Kamay WiFi\s*</div>', re.DOTALL)

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = nav_logo_pattern.sub(r'\1\n        ' + light_logo + r'\n      </a>', content)
    new_content = footer_logo_pattern.sub(r'\1\n          ' + dark_logo + r'\n        </div>', new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for filepath in glob.glob('*.html'):
    process_file(filepath)
