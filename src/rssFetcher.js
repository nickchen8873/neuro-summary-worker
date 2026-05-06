const Parser = require('rss-parser');

const parser = new Parser();

async function fetchTopArticles(feedUrl, count = 3) {
    const feed = await parser.parseURL(feedUrl);
    return feed.items.slice(0, count);
}

module.exports = { fetchTopArticles };
