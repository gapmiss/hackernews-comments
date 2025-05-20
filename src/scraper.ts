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
    // List of CORS proxies to try
    private corsProxies = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/'
    ];

    async scrapeComments(url: string): Promise<HNPostInfo> {
        try {
            // Validate URL
            if (!this.isValidHNUrl(url)) {
                throw new Error('Invalid HackerNews URL. Please provide a URL in the format: https://news.ycombinator.com/item?id=XXXXX');
            }

            // Extract the item ID from the URL
            const match = url.match(/item\?id=(\d+)/);
            const itemId = match ? match[1] : null;
            
            let originalUrl: string | undefined;
            let comments: HNComment[] = [];
            
            if (itemId) {
                // First try using the HackerNews API which doesn't have CORS restrictions
                try {
                    const apiResult = await this.fetchWithHackerNewsAPI(itemId);
                    comments = apiResult.comments;
                    originalUrl = apiResult.originalUrl;
                    const title = apiResult.title;
                    
                    if (comments.length > 0) {
                        return {
                            comments,
                            originalUrl,
                            postId: itemId,
                            commentCount: this.countTotalComments(comments),
                            scrapedDate: new Date().toISOString(),
                            title
                        };
                    }
                } catch (apiError) {
                    console.log('HackerNews API method failed:', apiError);
                }
            }

            // If API method failed, try other methods
            let html = '';
            let success = false;

            // Try using Node.js capabilities if available in Obsidian
            try {
                html = await this.fetchWithNodeJS(url);
                success = true;
            } catch (nodeError) {
                console.log('Node.js fetch method failed, trying CORS proxies:', nodeError);
            }

            // If Node.js method failed, try CORS proxies
            if (!success) {
                for (const proxy of this.corsProxies) {
                    try {
                        html = await this.fetchWithCorsProxy(proxy, url);
                        success = true;
                        break;
                    } catch (proxyError) {
                        console.log(`CORS proxy ${proxy} failed:`, proxyError);
                    }
                }
            }

            // If all methods failed, try with no-cors mode as a last resort
            if (!success) {
                try {
                    html = await this.fetchWithNoCors(url);
                    success = true;
                } catch (noCorsError) {
                    console.log('No-CORS mode failed:', noCorsError);
                }
            }

            if (!success || !html) {
                throw new Error('Failed to fetch HackerNews page using all available methods');
            }
            
            // Parse the HTML to extract comments and original URL
            const parseResult = this.parseComments(html);
            
            return {
                comments: parseResult.comments,
                originalUrl: parseResult.originalUrl,
                postId: itemId || 'unknown',
                commentCount: this.countTotalComments(parseResult.comments),
                scrapedDate: new Date().toISOString(),
                title: parseResult.title
            };
        } catch (error) {
            console.error('Error scraping HackerNews comments:', error);
            throw error;
        }
    }
    
    private async fetchWithHackerNewsAPI(itemId: string): Promise<{comments: HNComment[], originalUrl?: string, title?: string}> {
        // HackerNews API doesn't have CORS restrictions
        const itemUrl = `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`;
        const response = await fetch(itemUrl);
        
        if (!response.ok) {
            throw new Error(`HackerNews API request failed with status: ${response.status}`);
        }
        
        const item = await response.json();
        
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
                const response = await fetch(commentUrl);
                
                if (!response.ok) continue;
                
                const commentData = await response.json();
                
                // Skip deleted or dead comments
                if (!commentData || commentData.deleted || commentData.dead) continue;
                
                const comment: HNComment = {
                    id: `comment_${commentId}`,
                    author: commentData.by || 'Anonymous',
                    text: commentData.text || '',
                    time: this.formatTime(commentData.time),
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

    private async fetchWithNodeJS(url: string): Promise<string> {
        // Try to use Node.js capabilities if available in Obsidian
        // This uses the Electron environment's Node.js capabilities
        try {
            // @ts-ignore - Using require dynamically
            const https = (window as any).require('https');
            
            return new Promise((resolve, reject) => {
                https.get(url, (res: any) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Request failed with status code ${res.statusCode}`));
                        return;
                    }

                    let data = '';
                    res.on('data', (chunk: any) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        resolve(data);
                    });
                }).on('error', (err: any) => {
                    reject(err);
                });
            });
        } catch (error) {
            throw new Error('Node.js capabilities not available: ' + error.message);
        }
    }

    private async fetchWithCorsProxy(proxyUrl: string, targetUrl: string): Promise<string> {
        const response = await fetch(`${proxyUrl}${encodeURIComponent(targetUrl)}`);
        if (!response.ok) {
            throw new Error(`Proxy request failed with status: ${response.status}`);
        }
        return await response.text();
    }

    private async fetchWithNoCors(url: string): Promise<string> {
        // This is a last resort and may not work in all cases
        const response = await fetch(url, { 
            mode: 'no-cors',
            cache: 'no-cache',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // Note: With no-cors, we can't actually read the response content in most cases
        // This is mostly here as a fallback, but it may not work as expected
        if (response.type === 'opaque') {
            throw new Error('Cannot read response content in no-cors mode');
        }
        
        return await response.text();
    }

    private isValidHNUrl(url: string): boolean {
        // Check if the URL is a valid HackerNews item URL
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