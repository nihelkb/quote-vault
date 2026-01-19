/**
 * QuoteService - Single Responsibility: Handles quote CRUD operations
 * Dependency Inversion Principle: Depends on abstractions (db), not concrete implementations
 */
import { db } from '../config/firebase.js';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';

class QuoteService {
    constructor() {
        this.collectionName = 'quotes';
        this.unsubscribe = null;
    }

    /**
     * Subscribe to user's quotes in real-time
     * @param {string} userId - User ID
     * @param {Function} callback - Function to execute when quotes change
     * @returns {Function} - Unsubscribe function
     */
    subscribe(userId, callback) {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const quotes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(quotes);
        });

        return this.unsubscribe;
    }

    /**
     * Cancel active subscription
     */
    unsubscribeAll() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    /**
     * Create a new quote
     */
    async create(quoteData, userId) {
        const data = {
            ...quoteData,
            userId,
            favorite: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, this.collectionName), data);
        return { id: docRef.id, ...data };
    }

    /**
     * Update an existing quote
     */
    async update(quoteId, quoteData) {
        const data = {
            ...quoteData,
            updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, this.collectionName, quoteId), data);
        return { id: quoteId, ...data };
    }

    /**
     * Delete a quote
     */
    async delete(quoteId) {
        await deleteDoc(doc(db, this.collectionName, quoteId));
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(quoteId, isFavorite) {
        await updateDoc(doc(db, this.collectionName, quoteId), {
            favorite: isFavorite,
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Prepare quote data from form
     */
    prepareQuoteData(formData) {
        return {
            text: formData.text.trim(),
            author: formData.author.trim(),
            source: formData.source?.trim() || '',
            collectionId: formData.collectionId || null,
            stance: formData.stance,
            tags: this.parseTags(formData.tags),
            notes: formData.notes?.trim() || '',
            parentId: formData.parentId || null
        };
    }

    /**
     * Parse tags string to array
     */
    parseTags(tagsString) {
        if (!tagsString) return [];
        return tagsString
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
    }

    /**
     * Filter quotes by criteria
     */
    filterQuotes(quotes, filters) {
        const { searchTerm, collectionId, stance, favoriteOnly } = filters;

        return quotes.filter(quote => {
            const matchesSearch = !searchTerm ||
                quote.text.toLowerCase().includes(searchTerm) ||
                quote.author.toLowerCase().includes(searchTerm) ||
                (quote.source && quote.source.toLowerCase().includes(searchTerm)) ||
                (quote.tags && quote.tags.some(t => t.includes(searchTerm)));

            const matchesCollection = !collectionId || quote.collectionId === collectionId;
            const matchesStance = !stance || quote.stance === stance;
            const matchesFavorite = !favoriteOnly || quote.favorite === true;

            return matchesSearch && matchesCollection && matchesStance && matchesFavorite;
        });
    }

    /**
     * Sort quotes by criteria
     */
    sortQuotes(quotes, sortBy) {
        const sorted = [...quotes];

        switch (sortBy) {
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'author':
                return sorted.sort((a, b) => a.author.localeCompare(b.author));
            case 'newest':
            default:
                return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
    }

    /**
     * Get quotes by stance for compare view
     */
    getQuotesByStance(quotes, stance) {
        return quotes.filter(q => q.stance === stance);
    }

    /**
     * Get root quotes (quotes without parent)
     */
    getRootQuotes(quotes) {
        return quotes.filter(q => !q.parentId);
    }

    /**
     * Get replies/counterarguments for a specific quote
     */
    getReplies(quotes, parentId) {
        return quotes.filter(q => q.parentId === parentId);
    }

    /**
     * Build a tree structure of quotes with their replies
     */
    buildQuoteTree(quotes) {
        const rootQuotes = this.getRootQuotes(quotes);
        return rootQuotes.map(quote => this.buildQuoteNode(quote, quotes));
    }

    /**
     * Recursively build a quote node with nested replies
     */
    buildQuoteNode(quote, allQuotes) {
        const replies = this.getReplies(allQuotes, quote.id);
        return {
            ...quote,
            replies: replies.map(reply => this.buildQuoteNode(reply, allQuotes))
        };
    }

    /**
     * Get the reply count for a quote (including nested)
     */
    getReplyCount(quotes, quoteId) {
        const directReplies = this.getReplies(quotes, quoteId);
        let count = directReplies.length;
        directReplies.forEach(reply => {
            count += this.getReplyCount(quotes, reply.id);
        });
        return count;
    }

    /**
     * Delete a quote and all its replies recursively
     */
    async deleteWithReplies(quoteId, allQuotes) {
        const replies = this.getReplies(allQuotes, quoteId);
        for (const reply of replies) {
            await this.deleteWithReplies(reply.id, allQuotes);
        }
        await this.delete(quoteId);
    }
}

// Singleton
export const quoteService = new QuoteService();
