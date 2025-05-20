import { HNComment, HNPostInfo } from './scraper';
import { HNCommentsSettings } from './settings';

export class CommentFormatter {
    private settings: HNCommentsSettings;
    
    constructor(settings: HNCommentsSettings) {
        this.settings = settings;
    }
    
    formatComments(postInfo: HNPostInfo, sourceUrl: string): string {
        const { comments, originalUrl, postId, commentCount, scrapedDate, title } = postInfo;
        
        // Format the date for YAML frontmatter
        const date = new Date(scrapedDate);
        const formattedDate = date.toISOString();
        
        // Start with YAML frontmatter
        let markdown = `---\n`;
        markdown += `source: ${sourceUrl}\n`;
        markdown += `post-id: ${postId}\n`;
        markdown += `date: ${formattedDate}\n`;
        markdown += `comment-count: ${commentCount}\n`;
        
        // Add title to frontmatter
        if (title) {
            markdown += `title: "${this.escapeFrontmatterString(title)}"\n`;
        }
        
        // Add original URL if available
        if (originalUrl) {
            markdown += `original-url: ${originalUrl}\n`;
        }
        
        markdown += `---\n\n`;
        
        // Add header with title if available
        if (title) {
            markdown += `# ${title}\n\n`;
        } else {
            markdown += `# HackerNews Comments\n\n`;
        }
        
        // Add comments section
        markdown += `## Comments\n\n`;
        
        // Format each comment recursively
        comments.forEach((comment, index) => {
            // Add the comment
            markdown += this.formatComment(comment, 0, sourceUrl);
            
            // Add horizontal rule between top-level comments, but not after the last one
            if (index < comments.length - 1) {
                markdown += `---\n\n`;
            }
        });
        
        return markdown;
    }
    
    private formatComment(comment: HNComment, depth: number, sourceUrl: string): string {
        // Create indentation based on depth
        const indent = '  '.repeat(depth);
        
        // Format the comment with enhanced links if enabled
        let authorText = this.escapeMarkdown(comment.author);
        let timeText = comment.time;
        
        if (this.settings.enhancedLinks) {
            // Create link to user profile
            authorText = `[${this.escapeMarkdown(comment.author)}](https://news.ycombinator.com/user?id=${comment.author})`;
            
            // Create link to comment if we have the comment ID
            if (comment.id && comment.id.startsWith('comment_')) {
                const commentId = comment.id.replace('comment_', '');
                timeText = `[${comment.time}](${this.getCommentUrl(sourceUrl, commentId)})`;
            }
        }
        
        let markdown = `${indent}- **${authorText}** | ${timeText}\n`;
        
        // Add the comment text with proper indentation for multi-line text
        const formattedText = this.formatCommentText(comment.text);
        const indentedText = formattedText.split('\n')
            .map((line, index) => index === 0 ? `${indent}  ${line}` : `${indent}  ${line}`)
            .join('\n');
        
        markdown += `${indentedText}\n\n`;
        
        // Format children recursively
        comment.children.forEach(child => {
            markdown += this.formatComment(child, depth + 1, sourceUrl);
        });
        
        return markdown;
    }
    
    private getCommentUrl(sourceUrl: string, commentId: string): string {
        // Use only the comment ID for direct linking to the comment
        return `https://news.ycombinator.com/item?id=${commentId}`;
    }
    
    private escapeFrontmatterString(text: string): string {
        // Escape quotes in frontmatter strings
        return text.replace(/"/g, '\\"');
    }
    
    private formatCommentText(html: string): string {
        // Convert HTML to markdown-friendly format
        // This is a simple implementation - a more robust solution would use a proper HTML-to-Markdown converter
        
        // Replace <p> tags with newlines
        let text = html.replace(/<p>/g, '\n\n').replace(/<\/p>/g, '');
        
        // Replace <a> tags with markdown links
        text = text.replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)');
        
        // Replace <pre> tags
        text = text.replace(/<pre><code>([^<]+)<\/code><\/pre>/g, '```\n$1\n```');
        
        // Replace <code> tags
        text = text.replace(/<code>([^<]+)<\/code>/g, '`$1`');
        
        // Replace <i> tags
        text = text.replace(/<i>([^<]+)<\/i>/g, '*$1*');
        
        // Replace <b> tags
        text = text.replace(/<b>([^<]+)<\/b>/g, '**$1**');
        
        // Wrap HTML tags in backticks if the setting is enabled
        if (this.settings.wrapHtmlTags) {
            text = this.wrapHtmlTagsInBackticks(text);
        }
        
        // Replace common HTML entities
        text = text.replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&amp;/g, '&')
                   .replace(/&quot;/g, '"')
                   .replace(/&#x27;/g, "'")
                   .replace(/&#x2F;/g, '/');
        
        return text.trim();
    }
    
    private wrapHtmlTagsInBackticks(text: string): string {
        // Skip processing if the text is already in a code block
        // console.log(text);
        if (text.includes('```')) {

            // Split by code blocks and process only non-code parts
            const parts = text.split(/```(?:.*?)```/gi);
            const codeBlocks = text.match(/```(?:.*?)```/gi) || [];
            
            let result = '';
            for (let i = 0; i < parts.length; i++) {
                // Process the non-code part
                result += this.processHtmlTags(parts[i]);
                
                // Add back the code block if there is one
                if (i < codeBlocks.length) {
                    result += codeBlocks[i];
                }
            }
            
            return result;
        }
        
        return this.processHtmlTags(text);
    }
    
    private processHtmlTags(text: string): string {
        // Don't process text within existing backticks
        const parts = text.split(/`[^`]+`/g);
        const backtickContent = text.match(/`[^`]+`/g) || [];

        let result = '';
        for (let i = 0; i < parts.length; i++) {
            // Process HTML tags in this part
            let processed = parts[i];
            console.log(processed);
            
            // Match opening tags, closing tags, and self-closing tags
            // processed = processed.replace(
            //     /(<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*(?:=(?:"[^"]*"|'[^']*'|[^'"<>\s]+))?)*\s*\/?>)/g,
            //     '`$1`'
            // );
            
            // changed by @gapmiss
            // used &gt; & &lt;
            processed = processed.replace(
                /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*(?:=(?:"[^"]*"|'[^']*'|[^'"<>\s]+))?)*\s*\/?&gt;)/g,
                '`$1`'
            );
            
            result += processed;
            
            // Add back the backtick content if there is one
            if (i < backtickContent.length) {
                result += backtickContent[i];
            }
        }
        
        return result;
    }
    
    private escapeMarkdown(text: string): string {
        // Escape markdown special characters
        return text.replace(/([\\`*_{}[\]()#+-.!])/g, '\\$1');
    }
}