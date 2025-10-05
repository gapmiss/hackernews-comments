import { type App, moment, Notice, requestUrl } from "obsidian";
import HackerNewsCommentsPlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";

export interface HNComment {
    id: string;
    author: string;
    text: string;
    time: string;
    level: number;
    children: HNComment[];
    parentId?: string;
}

export interface HNPostInfo {
    comments: HNComment[];
    originalUrl?: string;
    postId: string;
    commentCount: number;
    scrapedDate: string;
    title?: string;
}

export class HNScraper {

    plugin: HackerNewsCommentsPlugin;

    constructor(plugin: HackerNewsCommentsPlugin) {
        this.plugin = plugin;
    }

    async scrapeComments(url: string, messageEl: Notice): Promise<HNPostInfo> {
        try {
            // Validate URL
            if (!this.isValidHNUrl(url)) {
                messageEl.hide();
                throw new Error('Invalid Hacker News URL. Please provide a URL in the format: https://news.ycombinator.com/item?id=XXXXX');
            }

            // Extract the item ID from the URL
            const match = url.match(/item\?id=(\d+)/);
            const itemId = match ? match[1] : null;

            if (!itemId) {
                throw new Error('Could not extract item ID from URL');
            }

            // Try using the Hacker News API first (preferred method)
            try {
                const apiResult = await this.fetchWithHackerNewsAPI(itemId);

                if (apiResult.comments.length > 0) {
                    return {
                        comments: apiResult.comments,
                        originalUrl: apiResult.originalUrl,
                        postId: itemId,
                        commentCount: this.countTotalComments(apiResult.comments),
                        scrapedDate: new Date().toISOString(),
                        title: apiResult.title
                    };
                }
            } catch (apiError) {
                console.log('Hacker News API method failed, falling back to HTML scraping:', apiError);
            }

            // Fallback: Fetch and parse HTML directly using Obsidian's requestUrl
            try {
                const response = await requestUrl(url);
                const html = response.text;

                const parseResult = this.parseComments(html);

                return {
                    comments: parseResult.comments,
                    originalUrl: parseResult.originalUrl,
                    postId: itemId,
                    commentCount: this.countTotalComments(parseResult.comments),
                    scrapedDate: new Date().toISOString(),
                    title: parseResult.title
                };
            } catch (htmlError) {
                messageEl.hide();
                throw new Error(`Failed to fetch Hacker News page: ${htmlError.message}`);
            }
        } catch (error) {
            console.error('Error scraping Hacker News comments:', error);
            throw error;
        }
    }

    private async fetchWithHackerNewsAPI(itemId: string): Promise<{comments: HNComment[], originalUrl?: string, title?: string}> {
        // Hacker News API doesn't have CORS restrictions
        const itemUrl = `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`;
        const response = await requestUrl(itemUrl);

        if (response.status !== 200) {
            throw new Error(`Hacker News API request failed with status: ${response.status}`);
        }

        const item = response.json;
        
        // Extract the original URL if available
        const originalUrl = item.url || undefined;
        
        // Extract the title if available
        const title = item.title || undefined;
        
        if (!item || !item.kids || item.kids.length === 0) {
            return { comments: [], originalUrl, title };
        }
        
        // Fetch all comments recursively
        const rootComments: HNComment[] = [];
        await this.fetchCommentsRecursively(item.kids, rootComments, 0);
        
        return { comments: rootComments, originalUrl, title };
    }
    
    private async fetchCommentsRecursively(
        commentIds: number[], 
        parentArray: HNComment[], 
        level: number, 
        parentId?: string
    ): Promise<void> {
        for (const commentId of commentIds) {
            try {
                const commentUrl = `https://hacker-news.firebaseio.com/v0/item/${commentId}.json`;
                const response = await requestUrl(commentUrl);

                if (response.status !== 200) continue;

                const commentData = response.json;
                
                // Skip deleted or dead comments
                if (!commentData || commentData.deleted || commentData.dead) continue;
                
                const date = moment.unix(commentData.time);

                const comment: HNComment = {
                    id: `comment_${commentId}`,
                    author: commentData.by || 'Anonymous',
                    text: commentData.text || '',
                    // time: this.formatTime(commentData.time),
                    // time: date.format("YYYY-MM-DD, hh:mm:ss"),
                    time: date.format(this.plugin.settings.dateFormat ? this.plugin.settings.dateFormat : DEFAULT_SETTINGS.dateFormat),
                    level,
                    children: [],
                    parentId
                };
                
                parentArray.push(comment);
                
                // Fetch child comments if any
                if (commentData.kids && commentData.kids.length > 0) {
                    await this.fetchCommentsRecursively(
                        commentData.kids, 
                        comment.children, 
                        level + 1, 
                        comment.id
                    );
                }
            } catch (error) {
                console.error(`Error fetching comment ${commentId}:`, error);
            }
        }
    }
    
    private formatTime(timestamp: number): string {
        if (!timestamp) return '';

        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 24) {
            return `${diffHours} hours ago`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} days ago`;
        }
    }

    private isValidHNUrl(url: string): boolean {
        // Check if the URL is a valid Hacker News item URL
        const regex = /^https?:\/\/news\.ycombinator\.com\/item\?id=\d+/;
        return regex.test(url);
    }

    private parseComments(html: string): {comments: HNComment[], originalUrl?: string, title?: string} {
        // Create a DOM parser to parse the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract the post title and details
        const postTitle = doc.querySelector('.titleline')?.textContent?.trim() || 'Unknown Title';
        
        // Extract the original URL if available
        let originalUrl: string | undefined;
        const titleLink = doc.querySelector('.titleline > a');
        if (titleLink && titleLink.getAttribute('href')) {
            originalUrl = titleLink.getAttribute('href') || undefined;
        }
        
        // Find all comment rows
        const commentRows = Array.from(doc.querySelectorAll('.comtr'));
        
        // Parse each comment
        const allComments: HNComment[] = [];
        const commentMap: Record<string, HNComment> = {};
        
        commentRows.forEach(row => {
            const id = row.id;
            if (!id) return; // Skip if no ID
            
            const indentEl = row.querySelector('.ind img');
            const level = indentEl ? parseInt(indentEl.getAttribute('width') || '0') / 40 : 0;
            
            const userEl = row.querySelector('.hnuser');
            const author = userEl ? userEl.textContent || 'Anonymous' : 'Anonymous';
            
            const ageEl = row.querySelector('.age');
            const time = ageEl ? ageEl.textContent || '' : '';
            
            const commentEl = row.querySelector('.commtext');
            const text = commentEl ? commentEl.innerHTML.trim() : '';
            
            // Create comment object
            const comment: HNComment = {
                id,
                author,
                text,
                time,
                level,
                children: []
            };
            
            // Store in map for quick lookup
            commentMap[id] = comment;
            
            // Add to the list of all comments
            allComments.push(comment);
        });
        
        // Build the comment tree
        const rootComments: HNComment[] = [];
        
        allComments.forEach(comment => {
            if (comment.level === 0) {
                rootComments.push(comment);
            } else {
                // Find parent comment
                const parentComment = this.findParentComment(allComments, comment);
                if (parentComment) {
                    comment.parentId = parentComment.id;
                    parentComment.children.push(comment);
                } else {
                    // If no parent found, add to root
                    rootComments.push(comment);
                }
            }
        });
        
        return { comments: rootComments, originalUrl, title: postTitle };
    }
    
    private findParentComment(comments: HNComment[], childComment: HNComment): HNComment | null {
        // Find the nearest comment with a lower level (parent)
        for (let i = comments.indexOf(childComment) - 1; i >= 0; i--) {
            if (comments[i].level < childComment.level) {
                return comments[i];
            }
        }
        return null;
    }
    
    private countTotalComments(comments: HNComment[]): number {
        let count = comments.length;
        
        comments.forEach(comment => {
            count += this.countTotalComments(comment.children);
        });
        
        return count;
    }
}