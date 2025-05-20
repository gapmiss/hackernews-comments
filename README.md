# HackerNews Comments Plugin for Obsidian

This plugin allows you to fetch and save HackerNews comments as Markdown notes in your Obsidian vault.

## Features

- Fetch comments from any HackerNews post
- Format comments with proper threading and indentation
- Include metadata like post title, original URL, and comment count
- Customize the filename of saved notes using template variables
- Enhanced links for usernames and timestamps (optional)

## How to Use

1. Click the HackerNews icon in the ribbon or use the "Fetch HackerNews Comments" command
2. Enter a valid HackerNews URL (e.g., https://news.ycombinator.com/item?id=12345678)
3. The plugin will fetch the comments and create a new note in your vault

## Settings

### Enhanced Links

When enabled, usernames and timestamps in comments will be converted to clickable links that point to the user's profile or the specific comment on HackerNews.

### Open Note Automatically

When enabled, the newly created note will be automatically opened in the editor after it's created.

### Wrap HTML Tags in Backticks

When enabled, HTML tags in comment content (like `<div>`, `<p>`, `<a href="...">`, etc.) will be automatically wrapped in backticks to prevent them from being interpreted as HTML. This is useful for preserving HTML code examples in comments.

The feature intelligently handles:
- Both opening and closing tags
- Self-closing tags (like `<br/>`)
- Skips content that's already in code blocks or backtick-wrapped
- Preserves attributes and their values

### Note Filename Template

Customize how the filename for saved notes is generated using template variables. The default template is `HN - {{title}} - {{date}}`.

#### Available Template Variables

- `{{title}}` - The HackerNews post title
- `{{post-id}}` - The HackerNews post ID
- `{{date}}` - The current date (YYYY-MM-DD format)
- `{{time}}` - The current time (HH-MM-SS format)
- `{{datetime}}` - The current date and time (YYYY-MM-DD-HH-MM-SS format)
- `{{source}}` - The source URL's hostname or "HackerNews"

Invalid characters in filenames will be automatically replaced with safe alternatives.

## Examples

### Example Templates

- `HN - {{title}} - {{date}}` → `HN - Ask HN: What's your favorite programming language - 2023-05-15.md`
- `HackerNews {{post-id}} - {{title}}` → `HackerNews 12345678 - Ask HN: What's your favorite programming language.md`
- `{{date}} - {{source}} - {{title}}` → `2023-05-15 - example.com - Interesting Article Title.md`

## Troubleshooting

If you encounter any issues with the plugin, please check the following:

- Make sure you're using a valid HackerNews URL (it should start with https://news.ycombinator.com/item?id=)
- If comments aren't loading, try again later as there might be temporary issues with the HackerNews API or website