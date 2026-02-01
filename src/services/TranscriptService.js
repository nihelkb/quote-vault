/**
 * TranscriptService - Fetches YouTube video transcripts
 * Uses multiple free APIs with fallback support
 */

class TranscriptService {
    constructor() {
        // API endpoints - ordered by reliability (supadata works best)
        this.apis = [
            {
                name: 'supadata',
                fetch: this.fetchFromSupadata.bind(this)
            },
            {
                name: 'kome',
                fetch: this.fetchFromKome.bind(this)
            },
            {
                name: 'youtubetranscript',
                fetch: this.fetchFromYouTubeTranscript.bind(this)
            }
        ];
    }

    /**
     * Main method to fetch transcript with fallback
     */
    async fetchTranscript(videoId, language = 'es') {
        let lastError = null;

        for (const api of this.apis) {
            try {
                console.log(`Trying ${api.name} API...`);
                const result = await api.fetch(videoId, language);
                if (result && result.length > 0) {
                    return this.formatTranscript(result);
                }
            } catch (error) {
                console.warn(`${api.name} API failed:`, error.message);
                lastError = error;
            }
        }

        throw new Error(lastError?.message || 'No se pudo obtener la transcripción');
    }

    /**
     * Kome.ai API (free, no auth)
     */
    async fetchFromKome(videoId, language) {
        const response = await fetch('https://api.kome.ai/api/tools/youtube-transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_id: videoId,
                format: true
            })
        });

        if (!response.ok) {
            throw new Error(`Kome API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.transcript) {
            // Kome returns formatted text, convert to segments
            return this.parseKomeTranscript(data.transcript);
        }

        throw new Error('No transcript data from Kome');
    }

    /**
     * YouTubeTranscript.com API (free)
     */
    async fetchFromYouTubeTranscript(videoId, language) {
        // This API might have CORS issues, but worth trying
        const response = await fetch(
            `https://youtubetranscript.com/?server_vid2=${videoId}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`YouTubeTranscript API error: ${response.status}`);
        }

        const text = await response.text();

        // Parse XML response
        return this.parseXMLTranscript(text);
    }

    async fetchFromSupadata(videoId) {
        const apiKey = import.meta.env.VITE_SUPADATA_API_KEY;
        if (!apiKey) {
            throw new Error('VITE_SUPADATA_API_KEY not configured');
        }

        const response = await fetch(`https://api.supadata.ai/v1/transcript?url=https://youtu.be/${videoId}`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey
            }
        });

        if (!response.ok) throw new Error('Error en Supadata API');
        
        const data = await response.json();
        // Supadata devuelve un array: [{text: "...", offset: 0, duration: 1000}, ...]
        return data.content.map(item => ({
            text: item.text,
            start: item.offset / 1000, // Convertir ms a segundos
            duration: item.duration / 1000
        }));
    }

    /**
     * Parse Kome transcript format
     */
    parseKomeTranscript(transcript) {
        if (typeof transcript === 'string') {
            // If it's plain text, create segments
            const lines = transcript.split('\n').filter(l => l.trim());
            return lines.map((text, index) => ({
                text: text.trim(),
                start: index * 5, // Approximate timing
                duration: 5
            }));
        }

        // If it's already structured
        if (Array.isArray(transcript)) {
            return transcript.map(item => ({
                text: item.text || item.content || '',
                start: item.start || item.offset || 0,
                duration: item.duration || 5
            }));
        }

        return [];
    }

    /**
     * Parse XML transcript format
     */
    parseXMLTranscript(xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const textElements = doc.querySelectorAll('text');

        return Array.from(textElements).map(el => ({
            text: el.textContent || '',
            start: parseFloat(el.getAttribute('start') || 0),
            duration: parseFloat(el.getAttribute('dur') || 5)
        }));
    }

    /**
     * Format transcript segments into readable article format
     */
    formatTranscript(segments) {
        if (!segments || segments.length === 0) {
            return { raw: '', formatted: '', segments: [] };
        }

        // Clean and merge segments into paragraphs
        const paragraphs = this.createParagraphs(segments);

        // Create formatted HTML
        const formatted = paragraphs.map(p => {
            const timestamp = this.formatTimestamp(p.startTime);
            return `<div class="transcript-paragraph" data-time="${p.startTime}">
                <span class="transcript-timestamp" onclick="seekToTime(${p.startTime})">${timestamp}</span>
                <p>${this.escapeHtml(p.text)}</p>
            </div>`;
        }).join('\n');

        // Create raw text
        const raw = paragraphs.map(p => p.text).join('\n\n');

        return {
            raw,
            formatted,
            segments,
            paragraphs
        };
    }

    /**
     * Group segments into logical paragraphs
     */
    createParagraphs(segments) {
        const paragraphs = [];
        let currentParagraph = {
            text: '',
            startTime: 0,
            segments: []
        };

        const PAUSE_THRESHOLD = 2; // seconds - indicates new paragraph
        const MIN_PARAGRAPH_LENGTH = 100; // characters
        const MAX_PARAGRAPH_LENGTH = 500; // characters

        segments.forEach((segment, index) => {
            const text = this.cleanText(segment.text);
            if (!text) return;

            // Check for natural break points
            const prevSegment = segments[index - 1];
            const timeSinceLast = prevSegment
                ? segment.start - (prevSegment.start + prevSegment.duration)
                : 0;

            const shouldStartNewParagraph =
                currentParagraph.text.length >= MAX_PARAGRAPH_LENGTH ||
                (timeSinceLast > PAUSE_THRESHOLD && currentParagraph.text.length >= MIN_PARAGRAPH_LENGTH) ||
                this.endsWithSentence(currentParagraph.text) && currentParagraph.text.length >= MIN_PARAGRAPH_LENGTH;

            if (shouldStartNewParagraph && currentParagraph.text) {
                paragraphs.push({ ...currentParagraph });
                currentParagraph = {
                    text: '',
                    startTime: segment.start,
                    segments: []
                };
            }

            if (!currentParagraph.text) {
                currentParagraph.startTime = segment.start;
            }

            currentParagraph.text += (currentParagraph.text ? ' ' : '') + text;
            currentParagraph.segments.push(segment);
        });

        // Don't forget the last paragraph
        if (currentParagraph.text) {
            paragraphs.push(currentParagraph);
        }

        return paragraphs;
    }

    /**
     * Clean transcript text
     */
    cleanText(text) {
        if (!text) return '';

        return text
            // Decode HTML entities
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            // Remove [Music], [Applause], etc.
            .replace(/\[.*?\]/g, '')
            // Remove multiple spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Check if text ends with sentence-ending punctuation
     */
    endsWithSentence(text) {
        return /[.!?]$/.test(text.trim());
    }

    /**
     * Format seconds to MM:SS or HH:MM:SS
     */
    formatTimestamp(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Extract video ID from various YouTube URL formats
     */
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }
}

// Singleton
export const transcriptService = new TranscriptService();
