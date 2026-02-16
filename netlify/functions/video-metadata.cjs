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
                        content: 'You are a helpful assistant that extracts the main descriptive content from YouTube video descriptions. Your task is to identify and return ONLY the 2-3 sentences that describe what the video is about, ignoring promotional content, social media links, timestamps, credits, and other metadata.'
                    },
                    {
                        role: 'user',
                        content: `Extract the main description (2-3 sentences) from this YouTube video description. Return ONLY the descriptive sentences, nothing else. Do not include promotional content, links, timestamps, credits, or social media information.\n\nDescription:\n${description}\n\nExtracted description:`
                    }
                ],
                temperature: 0.1, // Low temperature for consistent extraction
                max_tokens: 150,
                top_p: 1
            });

            const extracted = completion.choices[0]?.message?.content?.trim();

            if (extracted && extracted.length > 20 && extracted.length <= 400) {
                console.log('[Video Metadata] AI extraction successful:', extracted.substring(0, 100) + '...');
                return extracted;
            }

            console.log('[Video Metadata] AI extraction failed or invalid, falling back to regex');
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
