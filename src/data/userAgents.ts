export interface UserAgentProfile {
  name: string;
  category: 'desktop' | 'mobile';
  userAgent: string;
  secChUa: string;
  platform: string;
}

export const REALISTIC_USER_AGENTS: UserAgentProfile[] = [
  {
    name: 'Chrome 128 (Windows 11)',
    category: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    platform: '"Windows"'
  },
  {
    name: 'Chrome 128 (macOS Sonoma)',
    category: 'desktop',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    platform: '"macOS"'
  },
  {
    name: 'Safari 17.5 (macOS Sonoma)',
    category: 'desktop',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    secChUa: '',
    platform: '"macOS"'
  },
  {
    name: 'Firefox 129 (Windows 11)',
    category: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
    secChUa: '',
    platform: '"Windows"'
  },
  {
    name: 'Edge 128 (Windows 11)',
    category: 'desktop',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    secChUa: '"Chromium";v="128", "Microsoft Edge";v="128", "Not;A=Brand";v="24"',
    platform: '"Windows"'
  },
  {
    name: 'Safari 17.5 (iPhone iOS 17.5)',
    category: 'mobile',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    secChUa: '',
    platform: '"iOS"'
  },
  {
    name: 'Chrome 128 (Samsung Galaxy / Android 14)',
    category: 'mobile',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    secChUa: '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"',
    platform: '"Android"'
  },
  {
    name: 'Chrome 128 (Google Pixel 8 Pro / Android 14)',
    category: 'mobile',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    secChUa: '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"',
    platform: '"Android"'
  }
];

export const POPULAR_REFERRERS = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://duckduckgo.com/',
  'https://news.ycombinator.com/',
  'https://twitter.com/',
  'https://www.reddit.com/',
  'https://linkedin.com/',
  ''
];
