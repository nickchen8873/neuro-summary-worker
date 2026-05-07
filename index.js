require('dotenv').config();

const { fetchTopArticles } = require('./src/rssFetcher');
const { createGeminiClient } = require('./src/geminiClient');
const { sendTelegramMessage, escapeHtml } = require('./src/telegramNotifier');
const { saveArchive, getDateString, loadSeenLinks } = require('./src/archiver');

const FEED_URL = 'https://neurosciencenews.com/neuroscience-terms/neuroscience/feed/';
const ARTICLE_COUNT = 3;

function buildPrompt(articles) {
    let prompt = '你是一位專精於腦科學與神經科學的知識助理。請根據以下三篇最新文章的標題與簡介，提煉出關鍵的「腦科學知識點摘要」，請條理分明地列出：\n\n';
    articles.forEach((article, index) => {
        prompt += `【文章 ${index + 1}】\n標題：${article.title}\n簡介：${article.contentSnippet || '無提供簡介'}\n\n`;
    });
    return prompt;
}

function formatSuccessMessage(articles, summaryText) {
    const date = getDateString();
    const articleList = articles
        .map((a, i) => {
            const title = escapeHtml(a.title || `文章 ${i + 1}`);
            return a.link
                ? `${i + 1}. <a href="${escapeHtml(a.link)}">${title}</a>`
                : `${i + 1}. ${title}`;
        })
        .join('\n');

    return [
        `🧠 <b>腦科學每日摘要</b>`,
        `<i>${escapeHtml(date)}</i>`,
        '',
        escapeHtml(summaryText),
        '',
        `📚 <b>來源文章</b>`,
        articleList
    ].join('\n');
}

function formatErrorMessage(error) {
    const date = getDateString();
    const message = error && error.message ? error.message : String(error);
    return [
        `❌ <b>腦科學 Agent 執行失敗</b>`,
        `<i>${escapeHtml(date)}</i>`,
        '',
        `<b>錯誤訊息：</b>`,
        `<pre>${escapeHtml(message)}</pre>`
    ].join('\n');
}

async function notifyError(error) {
    try {
        await sendTelegramMessage(
            process.env.TELEGRAM_BOT_TOKEN,
            process.env.TELEGRAM_CHAT_ID,
            formatErrorMessage(error),
            { parseMode: 'HTML' }
        );
    } catch (notifyErr) {
        // 連錯誤通知都送不出去就只記 log，不要再 throw
        console.error('[Telegram] 推播錯誤通知時又失敗：', notifyErr.message);
    }
}

async function runNeuroAgent() {
    try {
        console.log('[步驟 1/4] 正在抓取最新腦科學文章...');
        const seenLinks = loadSeenLinks();
        console.log(`[狀態] 已載入 ${seenLinks.size} 筆歷史存檔連結，將跳過重複文章。`);
        const topArticles = await fetchTopArticles(FEED_URL, ARTICLE_COUNT, seenLinks);
        console.log(`[狀態] 成功取得 ${topArticles.length} 篇文章。`);

        const promptContent = buildPrompt(topArticles);

        console.log('[步驟 2/4] 正在發送資料至 Gemini API (啟用 Retry 機制)...');
        const gemini = createGeminiClient(process.env.GEMINI_API_KEY);
        const responseText = await gemini.generateContentWithRetry(promptContent);

        console.log('\n🚀 Agent 產出摘要如下：');
        console.log('====================================');
        console.log(responseText);
        console.log('====================================');

        console.log('\n[步驟 3/4] 存檔摘要至 archive/...');
        const filePath = saveArchive(topArticles, responseText);
        console.log(`[狀態] 已寫入 ${filePath}`);

        console.log('\n[步驟 4/4] 推播摘要至 Telegram...');
        await sendTelegramMessage(
            process.env.TELEGRAM_BOT_TOKEN,
            process.env.TELEGRAM_CHAT_ID,
            formatSuccessMessage(topArticles, responseText),
            { parseMode: 'HTML' }
        );

    } catch (error) {
        console.error('\n[錯誤定位] 執行過程中發生致命異常：');
        console.error(error.message);
        await notifyError(error);
        process.exitCode = 1;
    }
}

runNeuroAgent();
