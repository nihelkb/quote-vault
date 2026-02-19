const YTDlpWrap = require('yt-dlp-wrap').default;
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const jsonResponse = (statusCode, body) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
});

/**
 * Fetch content from URL
 */
function fetchURL(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (redirects >= 5) {
                    reject(new Error('Too many redirects'));
                    return;
                }
                resolve(fetchURL(res.headers.location, redirects + 1));
                return;
            }

            if (res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`Request failed with status ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });

        request.on('error', reject);
    });
}

function extractJsonObject(source, startIndex) {
    let index = startIndex;
    let depth = 0;
    let inString = false;
    let isEscaped = false;

    while (index < source.length) {
        const char = source[index];

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === '"') {
                inString = false;
            }
            index += 1;
            continue;
        }

        if (char === '"') {
            inString = true;
            index += 1;
            continue;
        }

        if (char === '{') depth += 1;
        if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return source.slice(startIndex, index + 1);
            }
        }

        index += 1;
    }

    return null;
}

function extractPlayerResponse(html) {
    const markers = [
        'var ytInitialPlayerResponse = ',
        'ytInitialPlayerResponse = ',
        'window["ytInitialPlayerResponse"] = '
    ];

    for (const marker of markers) {
        const markerIndex = html.indexOf(marker);
        if (markerIndex === -1) continue;

        const jsonStart = html.indexOf('{', markerIndex + marker.length);
        if (jsonStart === -1) continue;

        const jsonText = extractJsonObject(html, jsonStart);
        if (!jsonText) continue;

        try {
            return JSON.parse(jsonText);
        } catch {
            continue;
        }
    }

    throw new Error('Could not parse ytInitialPlayerResponse');
}

let ytDlpWrap = null;
const ytDlpBinaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const ytDlpBinaryPath = path.join(os.tmpdir(), ytDlpBinaryName);

function getYtDlpDownloadUrl() {
    if (process.platform === 'win32') {
        return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    }
    if (process.platform === 'linux') {
        return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
    }
    if (process.platform === 'darwin') {
        return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    }
    return 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
}

function downloadBinary(url, destinationPath, redirects = 0) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                'User-Agent': 'quote-vault-netlify-function'
            }
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                if (redirects >= 5) {
                    reject(new Error('Too many redirects while downloading yt-dlp'));
                    return;
                }
                resolve(downloadBinary(response.headers.location, destinationPath, redirects + 1));
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                reject(new Error(`Failed to download yt-dlp (status ${response.statusCode})`));
                return;
            }

            const fileStream = fs.createWriteStream(destinationPath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close(() => resolve());
            });

            fileStream.on('error', (error) => {
                fs.unlink(destinationPath, () => reject(error));
            });
        });

        request.on('error', reject);
    });
}

async function isValidCachedBinary(binaryPath) {
    if (!fs.existsSync(binaryPath)) return false;
    if (process.platform === 'win32') return true;

    try {
        const descriptor = await fs.promises.open(binaryPath, 'r');
        const buffer = Buffer.alloc(4);
        await descriptor.read(buffer, 0, 4, 0);
        await descriptor.close();

        const isElf = buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46;
        return isElf;
    } catch {
        return false;
    }
}

async function getYTDlpWrap() {
    if (ytDlpWrap) return ytDlpWrap;

    const hasValidBinary = await isValidCachedBinary(ytDlpBinaryPath);
    if (!hasValidBinary) {
        const downloadUrl = getYtDlpDownloadUrl();
        console.log('[Transcript Function] Downloading yt-dlp from:', downloadUrl);
        await downloadBinary(downloadUrl, ytDlpBinaryPath);
    }

    if (process.platform !== 'win32') {
        await fs.promises.chmod(ytDlpBinaryPath, 0o755).catch(() => {});
    }

    ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
    return ytDlpWrap;
}

function pickSubtitleTrackFromYtDlp(subtitlesSource, requestedLang) {
    const availableLangs = Object.keys(subtitlesSource || {});
    if (!availableLangs.length) {
        return null;
    }

    let usedLanguage = requestedLang;
    let isOriginal = false;
    let subtitleFormats = null;

    if (requestedLang && requestedLang !== 'auto') {
        if (availableLangs.includes(requestedLang)) {
            subtitleFormats = subtitlesSource[requestedLang];
            usedLanguage = requestedLang;
        } else {
            const matchedLang = availableLangs.find((language) => language.startsWith(`${requestedLang}-`));
            if (matchedLang) {
                subtitleFormats = subtitlesSource[matchedLang];
                usedLanguage = matchedLang;
            }
        }
    }

    if (!subtitleFormats) {
        const preferredLang = availableLangs.includes('en')
            ? 'en'
            : (availableLangs.includes('en-orig') ? 'en-orig' : availableLangs[0]);
        subtitleFormats = subtitlesSource[preferredLang];
        usedLanguage = preferredLang;
        isOriginal = true;
    }

    const preferredFormat =
        subtitleFormats.find((format) => format.ext === 'json3') ||
        subtitleFormats.find((format) => format.ext === 'vtt') ||
        subtitleFormats[0];

    return {
        preferredFormat,
        usedLanguage,
        isOriginal
    };
}

async function fetchTranscriptWithYtDlp(videoId, lang) {
    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
    const ytDlp = await getYTDlpWrap();
    const videoInfo = await ytDlp.getVideoInfo(videoURL);

    let subtitlesSource = videoInfo.subtitles;
    if (!subtitlesSource || Object.keys(subtitlesSource).length === 0) {
        subtitlesSource = videoInfo.automatic_captions;
    }

    const track = pickSubtitleTrackFromYtDlp(subtitlesSource, lang);
    if (!track) {
        return null;
    }

    const subtitleContent = await fetchURL(track.preferredFormat.url);
    if (!subtitleContent || subtitleContent.length === 0) {
        return null;
    }

    let segments;
    if (track.preferredFormat.ext === 'json3') {
        segments = parseJSON3Subtitles(subtitleContent);
    } else if (track.preferredFormat.ext === 'vtt') {
        segments = parseVTTSubtitles(subtitleContent);
    } else {
        return null;
    }

    if (!segments.length) {
        return null;
    }

    return {
        content: segments,
        language: track.usedLanguage,
        isOriginal: track.isOriginal,
        videoInfo: {
            title: videoInfo.title || null,
            duration: videoInfo.duration || null,
            thumbnail: videoInfo.thumbnail || null,
            uploader: videoInfo.uploader || videoInfo.channel || videoInfo.uploader_id || null,
            description: videoInfo.description || null
        }
    };
}

/**
 * Parse JSON3 subtitle format to our format
 */
function parseJSON3Subtitles(json3Text) {
    const data = JSON.parse(json3Text);
    const segments = [];

    if (data.events) {
        for (const event of data.events) {
            if (event.segs) {
                const text = event.segs.map(s => s.utf8 || '').join('');
                const cleanText = text.trim();

                if (cleanText && event.tStartMs !== undefined) {
                    segments.push({
                        text: cleanText,
                        offset: event.tStartMs,
                        duration: event.dDurationMs || 0
                    });
                }
            }
        }
    }

    return segments;
}

/**
 * Parse VTT subtitle format to our format
 */
function parseVTTSubtitles(vttText) {
    const segments = [];
    const lines = vttText.split('\n');

    let currentSegment = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Match timestamp line: "00:00:01.601 --> 00:00:06.439"
        const timestampMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);

        if (timestampMatch) {
            if (currentSegment && currentSegment.text) {
                segments.push(currentSegment);
            }

            const startMs = (
                parseInt(timestampMatch[1]) * 3600000 +
                parseInt(timestampMatch[2]) * 60000 +
                parseInt(timestampMatch[3]) * 1000 +
                parseInt(timestampMatch[4])
            );

            const endMs = (
                parseInt(timestampMatch[5]) * 3600000 +
                parseInt(timestampMatch[6]) * 60000 +
                parseInt(timestampMatch[7]) * 1000 +
                parseInt(timestampMatch[8])
            );

            currentSegment = {
                text: '',
                offset: startMs,
                duration: endMs - startMs
            };
        } else if (currentSegment && line && !line.startsWith('WEBVTT') && !line.startsWith('Kind:') && !line.startsWith('Language:')) {
            // This is subtitle text
            currentSegment.text += (currentSegment.text ? '\n' : '') + line;
        }
    }

    // Don't forget the last segment
    if (currentSegment && currentSegment.text) {
        segments.push(currentSegment);
    }

    return segments;
}

exports.handler = async (event) => {
    try {
        const params = event.queryStringParameters || {};
        const videoId = params.videoId;
        const lang = params.lang || 'auto';

        console.log('[Transcript Function] Received request:', { videoId, lang });

        if (!videoId) {
            console.log('[Transcript Function] Missing videoId');
            return jsonResponse(400, { message: 'videoId is required' });
        }

        try {
            const ytDlpResult = await fetchTranscriptWithYtDlp(videoId, lang);
            if (ytDlpResult) {
                console.log('[Transcript Function] Success via yt-dlp');
                return jsonResponse(200, ytDlpResult);
            }
        } catch (ytDlpError) {
            console.warn('[Transcript Function] yt-dlp strategy failed, using fallback:', ytDlpError.message);
        }

        const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
        const watchHtml = await fetchURL(videoURL);
        const playerResponse = extractPlayerResponse(watchHtml);

        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (!captionTracks.length) {
            console.log('[Transcript Function] No caption tracks available');
            return jsonResponse(404, { message: 'No subtitles available for this video' });
        }

        let usedLanguage = lang;
        let isOriginal = false;
        let selectedTrack = null;

        if (lang && lang !== 'auto') {
            selectedTrack = captionTracks.find(track => track.languageCode === lang)
                || captionTracks.find(track => track.languageCode?.startsWith(`${lang}-`))
                || captionTracks.find(track => track.vssId?.includes(`.${lang}`));
        }

        if (!selectedTrack) {
            selectedTrack = captionTracks.find(track => track.languageCode === 'en') || captionTracks[0];
            usedLanguage = selectedTrack.languageCode || 'auto';
            isOriginal = true;
        } else {
            usedLanguage = selectedTrack.languageCode || usedLanguage;
        }

        const json3Url = `${selectedTrack.baseUrl}${selectedTrack.baseUrl.includes('?') ? '&' : '?'}fmt=json3`;
        const vttUrl = `${selectedTrack.baseUrl}${selectedTrack.baseUrl.includes('?') ? '&' : '?'}fmt=vtt`;

        console.log('[Transcript Function] Downloading subtitle...');
        let subtitleContent = await fetchURL(json3Url).catch(() => null);
        let subtitleFormat = 'json3';

        if (!subtitleContent) {
            subtitleContent = await fetchURL(vttUrl);
            subtitleFormat = 'vtt';
        }

        if (!subtitleContent || subtitleContent.length === 0) {
            console.log('[Transcript Function] Empty subtitle content');
            return jsonResponse(404, { message: 'Subtitle content is empty' });
        }

        // Parse based on format
        let segments;
        if (subtitleFormat === 'json3') {
            console.log('[Transcript Function] Parsing JSON3 format...');
            segments = parseJSON3Subtitles(subtitleContent);
        } else if (subtitleFormat === 'vtt') {
            console.log('[Transcript Function] Parsing VTT format...');
            segments = parseVTTSubtitles(subtitleContent);
        } else {
            console.log('[Transcript Function] Unsupported format:', subtitleFormat);
            return jsonResponse(500, { message: 'Unsupported subtitle format' });
        }

        if (segments.length === 0) {
            console.log('[Transcript Function] No segments parsed');
            return jsonResponse(404, { message: 'Could not parse subtitles' });
        }

        console.log('[Transcript Function] Success! Got', segments.length, 'segments');
        console.log('[Transcript Function] First segment:', segments[0]);

        return jsonResponse(200, {
            content: segments,
            language: usedLanguage,
            isOriginal,
            videoInfo: {
                title: playerResponse?.videoDetails?.title || null,
                duration: Number.parseInt(playerResponse?.videoDetails?.lengthSeconds, 10) || null,
                thumbnail: playerResponse?.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
                uploader: playerResponse?.videoDetails?.author || null,
                description: playerResponse?.videoDetails?.shortDescription || null
            }
        });
    } catch (error) {
        console.error('[Transcript Function] Error:', error.message);
        console.error('[Transcript Function] Stack:', error.stack);
        return jsonResponse(500, {
            message: error.message || 'Failed to fetch subtitles'
        });
    }
};
