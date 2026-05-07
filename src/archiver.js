const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = path.join(__dirname, '..', 'archive');
const TIME_ZONE = 'Asia/Taipei';

function getDateString() {
    // en-CA 在 zh-TW 時區下會輸出 YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function getTimestamp() {
    // sv-SE 輸出類似 "2026-05-06 08:01:23"
    return new Date().toLocaleString('sv-SE', {
        timeZone: TIME_ZONE,
        hour12: false
    });
}

function buildMarkdown(date, timestamp, articles, summaryText) {
    let md = `# 🧠 腦科學每日摘要 — ${date}\n\n`;
    md += `> 產生時間：${timestamp} (${TIME_ZONE})\n\n`;

    md += `## 來源文章\n\n`;
    articles.forEach((article, i) => {
        const snippet = (article.contentSnippet || '無提供簡介').trim();
        md += `${i + 1}. **${article.title}**  \n`;
        md += `   ${snippet}\n`;
        if (article.link) md += `   \n   [原文連結](${article.link})\n`;
        md += '\n';
    });

    md += `## AI 摘要\n\n${summaryText}\n\n`;
    md += `---\n\n`;
    md += `來源：[Neuroscience News](https://neurosciencenews.com/neuroscience-terms/neuroscience/feed/)\n`;
    return md;
}

function saveArchive(articles, summaryText) {
    const date = getDateString();
    const timestamp = getTimestamp();
    const md = buildMarkdown(date, timestamp, articles, summaryText);

    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const filePath = path.join(ARCHIVE_DIR, `${date}.md`);
    fs.writeFileSync(filePath, md, 'utf8');
    return filePath;
}

function loadSeenLinks() {
    const seen = new Set();
    if (!fs.existsSync(ARCHIVE_DIR)) return seen;

    const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.md'));
    const linkPattern = /\[原文連結\]\((https?:\/\/[^\s)]+)\)/g;

    for (const file of files) {
        const content = fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf8');
        let match;
        while ((match = linkPattern.exec(content)) !== null) {
            seen.add(match[1]);
        }
    }
    return seen;
}

module.exports = { saveArchive, getDateString, loadSeenLinks };
