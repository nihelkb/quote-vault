/**
 * TranscriptService - Fetches YouTube video transcripts
 * Uses Netlify Functions + youtube-transcript for language support
 */

class TranscriptService {
    constructor() {
        // Available languages for transcription
        this.availableLanguages = [
            { code: 'auto', label: 'Auto (Original)', labelEn: 'Auto (Original)' },
            { code: 'es', label: 'Español', labelEn: 'Spanish' },
            { code: 'en', label: 'English', labelEn: 'English' },
            { code: 'pt', label: 'Português', labelEn: 'Portuguese' },
            { code: 'fr', label: 'Français', labelEn: 'French' },
            { code: 'de', label: 'Deutsch', labelEn: 'German' },
            { code: 'it', label: 'Italiano', labelEn: 'Italian' },
            { code: 'ja', label: '日本語', labelEn: 'Japanese' },
            { code: 'ko', label: '한국어', labelEn: 'Korean' },
            { code: 'zh', label: '中文', labelEn: 'Chinese' }
        ];
    }

    /**
     * Get available languages for the UI
     */
    getAvailableLanguages() {
        return this.availableLanguages;
    }

    /**
     * Main method to fetch transcript
     * @param {string} videoId - YouTube video ID
     * @param {string} language - Language code (es, en, auto, etc.)
     */
    async fetchTranscript(videoId, language = 'auto') {
        try {
            console.log(`Fetching transcript for ${videoId} in language: ${language}`);
            const params = new URLSearchParams({ videoId });
            if (language && language !== 'auto') {
                params.set('lang', language);
            }
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
            const endpoints = [`${backendUrl}/api/transcript`];

            let lastError;
            for (const endpoint of endpoints) {
                const response = await fetch(`${endpoint}?${params.toString()}`);
                const contentType = response.headers.get('content-type') || '';

                if (!response.ok) {
                    const errorData = contentType.includes('application/json')
                        ? await response.json().catch(() => ({}))
                        : {};
                    lastError = new Error(errorData.message || `Error al obtener transcripción (${response.status})`);
                    continue;
                }

                if (!contentType.includes('application/json')) {
                    lastError = new Error(`El backend (${endpoint}) devolvió una respuesta que no es JSON (Content-Type: ${contentType || 'none'}). Verifica que VITE_BACKEND_URL apunte al servidor Express correcto.`);
                    continue;
                }

                const data = await response.json();
                if (!data.content || data.content.length === 0) {
                    throw new Error('No hay transcripción disponible para este video en el idioma seleccionado');
                }

                const segments = data.content.map(item => ({
                    text: item.text,
                    start: (Number(item.offset) || 0) / 1000, // Convert milliseconds to seconds
                    duration: (Number(item.duration) || 0) / 1000 // Convert milliseconds to seconds
                }));

                const formatted = this.formatTranscript(segments);
                return {
                    ...formatted,
                    language: data.language || (language || 'auto'),
                    isOriginal: Boolean(data.isOriginal)
                };
            }

            throw lastError || new Error('No se pudo obtener la transcripción');
        } catch (error) {
            console.error('Transcript fetch failed:', error.message);
            throw error;
        }
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
