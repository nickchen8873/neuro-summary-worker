const Parser = require('rss-parser');

const parser = new Parser();

async function fetchTopArticles(feedUrl, count = 3, seenLinks = new Set()) {
    const feed = await parser.parseURL(feedUrl);
    const picked = [];
    const skipped = [];

    for (const item of feed.items) {
        if (item.link && seenLinks.has(item.link)) {
            skipped.push(item.title || item.link);
            continue;
        }
        picked.push(item);
        if (picked.length >= count) break;
    }

    if (skipped.length > 0) {
        console.log(`[RSS] 跳過 ${skipped.length} 篇已存檔文章，往前抓取下一批。`);
    }

    if (picked.length < count) {
        console.warn(`[RSS] 警告：feed 內僅找到 ${picked.length} 篇未存檔文章（目標 ${count} 篇）。`);
    }

    return picked;
}

module.exports = { fetchTopArticles };
