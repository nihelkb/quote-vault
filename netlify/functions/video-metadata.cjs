const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const Groq = require('groq-sdk');

const jsonResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
});

// Initialize Groq client (will be null if no API key)
let groqClient = null;
if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });
}

// Initialize yt-dlp wrapper (singleton)
let ytDlpWrap = null;
const ytDlpBinaryPath = path.join(__dirname, '..', '..', 'yt-dlp.exe');

async function getYTDlpWrap() {
    if (!ytDlpWrap) {
        // Try to download binary if not exists
        try {
            await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath);
            console.log('[Video Metadata Function] Downloaded yt-dlp binary');
        } catch (error) {
            console.log('[Video Metadata Function] yt-dlp binary already exists or download not needed');
        }

        ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
    }
    return ytDlpWrap;
}

/**
 * Extract meaningful description using Groq AI
 * Falls back to regex-based extraction if AI is unavailable
 */
async function extractDescriptionSummary(description) {
    if (!description) return null;

    // Try AI extraction first if Groq is available
    if (groqClient) {
        try {
            console.log('[Video Metadata] Using Groq AI to extract description...');

            const completion = await groqClient.chat.completions.create({
                model: 'llama-3.1-8b-instant', // Fast and free model
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at summarizing YouTube video descriptions. Your task is to read the ENTIRE description and create a concise 2-3 sentence summary that captures the main topic and key points of the video. Ignore promotional content, links, timestamps, and credits. Focus on WHAT the video is about and WHY it matters.'
                    },
                    {
                        role: 'user',
                        content: `Read this YouTube video description and write a clear, informative 2-3 sentence summary. The summary should capture the video's main topic and key points. Do NOT just copy the beginning - read the whole description first, then summarize.\n\nDescription:\n${description}\n\nWrite a 2-3 sentence summary of what this video is about:`
                    }
                ],
                temperature: 0.3, // Slightly higher for better summarization
                max_tokens: 200,
                top_p: 1
            });

            const extracted = completion.choices[0]?.message?.content?.trim();

            if (!extracted) {
                console.log('[Video Metadata] Groq returned null/empty, falling back to regex');
                return extractDescriptionFallback(description);
            }

            // Count words instead of characters for better control
            const wordCount = extracted.split(/\s+/).filter(w => w.length > 0).length;
            const charCount = extracted.length;

            console.log('[Video Metadata] Groq returned:', wordCount, 'words,', charCount, 'chars');
            console.log('[Video Metadata] Content preview:', extracted.substring(0, 150) + '...');

            // Validate: between 20 and 150 words (roughly 2-4 sentences)
            if (wordCount >= 20 && wordCount <= 150) {
                console.log('[Video Metadata] AI extraction successful!');
                return extracted;
            }

            // If too long, try to truncate at last sentence before 150 words
            if (wordCount > 150) {
                const words = extracted.split(/\s+/);
                const truncated = words.slice(0, 150).join(' ');
                const lastPeriod = truncated.lastIndexOf('.');

                if (lastPeriod > 0) {
                    const result = truncated.substring(0, lastPeriod + 1);
                    console.log('[Video Metadata] Truncated from', wordCount, 'to', result.split(/\s+/).length, 'words');
                    return result;
                }
            }

            console.log('[Video Metadata] AI extraction failed validation (', wordCount, 'words), falling back to regex');
        } catch (error) {
            console.error('[Video Metadata] Groq API error:', error.message);
            // Continue to fallback
        }
    }

    // Fallback: Simple regex-based extraction
    console.log('[Video Metadata] Using fallback regex extraction...');
    return extractDescriptionFallback(description);
}

/**
 * Fallback extraction using simple regex patterns
 */
function extractDescriptionFallback(description) {
    // Remove URLs first
    let cleaned = description
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Split into lines and find first substantial paragraph
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Take first few non-promotional lines
    const contentLines = [];
    for (const line of lines) {
        // Stop at timestamps
        if (/^\d{1,2}:\d{2}/.test(line)) break;

        // Skip obvious promotional lines
        if (/^(support|follow|subscribe|join|watch|get)/i.test(line)) {
            if (contentLines.length > 0) break; // Stop if we already have content
            continue;
        }

        if (line.length >= 20) {
            contentLines.push(line);
            const joined = contentLines.join(' ');
            if (joined.length > 200) break;
        }
    }

    const result = contentLines.join(' ').substring(0, 350);
    return result || null;
}

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, {});
    }

    try {
        const params = event.queryStringParameters || {};
        const videoId = params.videoId;

        console.log('[Video Metadata Function] Received request:', { videoId });

        if (!videoId) {
            console.log('[Video Metadata Function] Missing videoId');
            return jsonResponse(400, { message: 'videoId is required' });
        }

        const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

        // Get yt-dlp wrapper
        const ytDlp = await getYTDlpWrap();

        // Get video info (metadata only, no subtitles)
        console.log('[Video Metadata Function] Fetching video metadata...');
        const videoInfo = await ytDlp.getVideoInfo(videoURL);

        console.log('[Video Metadata Function] Success! Got metadata for:', videoInfo.title);

        // Extract description summary using AI
        const descriptionSummary = await extractDescriptionSummary(videoInfo.description);

        return jsonResponse(200, {
            title: videoInfo.title || null,
            duration: videoInfo.duration || null, // in seconds
            thumbnail: videoInfo.thumbnail || null,
            channel: videoInfo.uploader || videoInfo.channel || videoInfo.uploader_id || null,
            description: descriptionSummary,
            fullDescription: videoInfo.description || null
        });
    } catch (error) {
        console.error('[Video Metadata Function] Error:', error.message);
        console.error('[Video Metadata Function] Stack:', error.stack);
        return jsonResponse(500, {
            message: error.message || 'Failed to fetch video metadata'
        });
    }
};
