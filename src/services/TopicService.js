/**
 * TopicService - Handles wiki topic operations
 * Topics are structured knowledge containers (evolution of collections)
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
    onSnapshot,
    getDoc
} from 'firebase/firestore';

class TopicService {
    constructor() {
        this.collectionName = 'topics';
        this.unsubscribe = null;
    }

    /**
     * Subscribe to user's topics in real-time
     */
    subscribe(userId, callback, onError = console.error) {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const q = query(
            collection(db, this.collectionName),
            where('userId', '==', userId)
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const topics = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by updatedAt descending (most recent first)
            topics.sort((a, b) => {
                const dateA = a.updatedAt || a.createdAt;
                const dateB = b.updatedAt || b.createdAt;
                return new Date(dateB) - new Date(dateA);
            });
            callback(topics);
        }, error => onError(error));

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
     * Create a new topic with default structure
     */
    async create(data, userId) {
        const now = new Date().toISOString();

        const topicData = {
            userId,
            name: data.name.trim(),
            description: data.description || '',
            icon: data.icon || '📁',
            status: 'in_progress',

            // Custom sections (user-defined wiki sections)
            customSections: data.customSections || [],

            tags: data.tags || [],
            relatedTopicIds: data.relatedTopicIds || [],

            createdAt: now,
            updatedAt: now
        };

        const docRef = await addDoc(collection(db, this.collectionName), topicData);
        return { id: docRef.id, ...topicData };
    }

    /**
     * Update a topic
     */
    async update(topicId, data) {
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        // Don't allow updating userId or createdAt
        delete updateData.userId;
        delete updateData.createdAt;
        delete updateData.id;

        await updateDoc(doc(db, this.collectionName, topicId), updateData);
    }

    /**
     * Delete a topic
     */
    async delete(topicId) {
        await deleteDoc(doc(db, this.collectionName, topicId));
    }

    /**
     * Get a single topic by ID
     */
    async getById(topicId) {
        const docSnap = await getDoc(doc(db, this.collectionName, topicId));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    }

    /**
     * Find topic by ID from local array
     */
    findById(topics, topicId) {
        return topics.find(t => t.id === topicId);
    }

    /**
     * Toggle topic status
     */
    async toggleStatus(topicId, currentStatus) {
        const newStatus = currentStatus === 'in_progress' ? 'consolidated' : 'in_progress';
        await this.update(topicId, { status: newStatus });
        return newStatus;
    }

    /**
     * Add a related topic connection
     */
    async addRelatedTopic(topicId, relatedTopicId, currentRelated = []) {
        if (!currentRelated.includes(relatedTopicId)) {
            const newRelated = [...currentRelated, relatedTopicId];
            await this.update(topicId, { relatedTopicIds: newRelated });
        }
    }

    /**
     * Remove a related topic connection
     */
    async removeRelatedTopic(topicId, relatedTopicId, currentRelated = []) {
        const newRelated = currentRelated.filter(id => id !== relatedTopicId);
        await this.update(topicId, { relatedTopicIds: newRelated });
    }

    /**
     * Add a custom section to a topic
     */
    async addCustomSection(topicId, sectionData, currentSections = []) {
        const newSection = {
            id: Date.now().toString(),
            name: sectionData.name.trim(),
            icon: sectionData.icon || '📄',
            type: sectionData.type || 'document', // 'list' or 'document'

            // For document type
            content: sectionData.content || '',

            // For list type
            entries: sectionData.entries || [],

            order: currentSections.length,
            color: sectionData.color || null,
            linkedInsightIds: sectionData.linkedInsightIds || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedSections = [...currentSections, newSection];
        await this.update(topicId, { customSections: updatedSections });
        return newSection;
    }

    /**
     * Add an entry to a list-type section
     */
    async addEntryToSection(topicId, sectionId, entryData, currentSections = []) {
        const newEntry = {
            id: Date.now().toString(),
            title: entryData.title?.trim() || '',
            content: entryData.content?.trim() || '',
            date: entryData.date || null,
            source: entryData.source || null,
            sourceUrl: entryData.sourceUrl || null,
            tags: entryData.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const updatedSections = currentSections.map(section => {
            if (section.id === sectionId) {
                const entries = section.entries || [];
                return {
                    ...section,
                    entries: [...entries, newEntry],
                    updatedAt: new Date().toISOString()
                };
            }
            return section;
        });

        await this.update(topicId, { customSections: updatedSections });
        return newEntry;
    }

    /**
     * Update an entry in a section
     */
    async updateSectionEntry(topicId, sectionId, entryId, updates, currentSections = []) {
        const updatedSections = currentSections.map(section => {
            if (section.id === sectionId) {
                const entries = (section.entries || []).map(entry =>
                    entry.id === entryId
                        ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
                        : entry
                );
                return {
                    ...section,
                    entries,
                    updatedAt: new Date().toISOString()
                };
            }
            return section;
        });

        await this.update(topicId, { customSections: updatedSections });
    }

    /**
     * Delete an entry from a section
     */
    async deleteSectionEntry(topicId, sectionId, entryId, currentSections = []) {
        const updatedSections = currentSections.map(section => {
            if (section.id === sectionId) {
                const entries = (section.entries || []).filter(entry => entry.id !== entryId);
                return {
                    ...section,
                    entries,
                    updatedAt: new Date().toISOString()
                };
            }
            return section;
        });

        await this.update(topicId, { customSections: updatedSections });
    }

    /**
     * Update a custom section
     */
    async updateCustomSection(topicId, sectionId, updates, currentSections = []) {
        const updatedSections = currentSections.map(section =>
            section.id === sectionId
                ? { ...section, ...updates, updatedAt: new Date().toISOString() }
                : section
        );
        await this.update(topicId, { customSections: updatedSections });
    }

    /**
     * Delete a custom section
     */
    async deleteCustomSection(topicId, sectionId, currentSections = []) {
        const updatedSections = currentSections.filter(section => section.id !== sectionId);
        await this.update(topicId, { customSections: updatedSections });
    }

    /**
     * Reorder custom sections
     */
    async reorderSections(topicId, newSections) {
        const reorderedSections = newSections.map((section, index) => ({
            ...section,
            order: index,
            updatedAt: new Date().toISOString()
        }));
        await this.update(topicId, { customSections: reorderedSections });
    }
}

// Singleton
export const topicService = new TopicService();
