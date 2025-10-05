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
            markdown += `# Hacker News Comments\n\n`;
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
        // Security: Properly escape YAML frontmatter strings
        // Replace quotes and backslashes, and handle special YAML characters
        return text
            .replace(/\\/g, '\\\\')  // Escape backslashes first
            .replace(/"/g, '\\"')     // Escape quotes
            .replace(/\n/g, '\\n')    // Escape newlines
            .replace(/\r/g, '\\r')    // Escape carriage returns
            .replace(/\t/g, '\\t');   // Escape tabs
    }
    
    private formatCommentText(html: string): string {
        // Security: Use DOMParser for safer HTML processing
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Convert DOM to markdown safely by walking the tree
        let text = this.domToMarkdown(doc.body);

        // Wrap HTML tags in backticks if the setting is enabled
        if (this.settings.wrapHtmlTags) {
            text = this.wrapHtmlTagsInBackticks(text);
        }

        // Replace common HTML entities (defense in depth)
        text = this.decodeHtmlEntities(text);

        return text.trim();
    }

    private domToMarkdown(node: Node): string {
        let result = '';

        node.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent || '';
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const element = child as HTMLElement;
                const tagName = element.tagName.toLowerCase();

                switch (tagName) {
                    case 'p':
                        result += '\n\n' + this.domToMarkdown(element);
                        break;
                    case 'a':
                        const href = element.getAttribute('href') || '';
                        const linkText = element.textContent || '';
                        // Security: Validate URL scheme to prevent javascript: and data: URLs
                        if (this.isSafeUrl(href)) {
                            result += `[${linkText}](${href})`;
                        } else {
                            result += linkText; // Strip unsafe links
                        }
                        break;
                    case 'pre':
                        const codeContent = element.textContent || '';
                        result += '```\n' + codeContent + '\n```';
                        break;
                    case 'code':
                        // Check if it's inside a <pre> tag to avoid double wrapping
                        if (element.parentElement?.tagName.toLowerCase() !== 'pre') {
                            result += '`' + (element.textContent || '') + '`';
                        } else {
                            result += element.textContent || '';
                        }
                        break;
                    case 'i':
                    case 'em':
                        result += '*' + this.domToMarkdown(element) + '*';
                        break;
                    case 'b':
                    case 'strong':
                        result += '**' + this.domToMarkdown(element) + '**';
                        break;
                    case 'br':
                        result += '\n';
                        break;
                    default:
                        // For any other tags, just extract the text content
                        result += this.domToMarkdown(element);
                }
            }
        });

        return result;
    }

    private isSafeUrl(url: string): boolean {
        // Security: Only allow http, https, and relative URLs
        if (!url) return false;
        const trimmed = url.trim().toLowerCase();
        return trimmed.startsWith('http://') ||
               trimmed.startsWith('https://') ||
               trimmed.startsWith('/') ||
               trimmed.startsWith('#') ||
               (!trimmed.includes(':') && !trimmed.startsWith('//'));
    }

    private decodeHtmlEntities(text: string): string {
        return text.replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&amp;/g, '&')
                   .replace(/&quot;/g, '"')
                   .replace(/&#x27;/g, "'")
                   .replace(/&#x2F;/g, '/')
                   .replace(/&#39;/g, "'");
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