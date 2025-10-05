# Hacker News Comments

An Obsidian plugin that fetches and saves Hacker News comments as Markdown notes.

## Features

- Fetch comments from any Hacker News post
- Threaded comment formatting with proper indentation
- Metadata included: post title, original URL, comment count
- Customizable note filenames using template variables
- Optional enhanced links for usernames and timestamps
- Automatic HTML-to-Markdown conversion

## How to use

1. Click the Hacker News icon in the ribbon or use the "Fetch Hacker News Comments" command
2. Enter a valid Hacker News URL (e.g., https://news.ycombinator.com/item?id=12345678)
3. The plugin will fetch the comments and create a new note in your vault

## Settings

### Enhanced links
Convert usernames and timestamps to clickable links pointing to Hacker News profiles and specific comments.

### Timestamp format
Customize the date format for comment timestamps using moment.js formatting tokens. Default: `YYYY-MM-DD, hh:mm:ss`

### Open note automatically
Automatically open newly created notes in the editor.

### Wrap HTML tags in backticks
Wrap HTML tags in comment content with backticks to preserve code examples and prevent HTML rendering.

### Filename template
Customize note filenames using template variables. Default: `HN - {{title}} - {{date}}`

Available variables:
- `{{title}}` - Post title
- `{{post-id}}` - Post ID
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{time}}` - Current time (HH-MM-SS)
- `{{datetime}}` - Date and time (YYYY-MM-DD-HH-MM-SS)
- `{{source}}` - Source hostname or "Hacker News"

## Example filename templates

- `HN - {{title}} - {{date}}`
- `Hacker News {{post-id}} - {{title}}`
- `{{date}} - {{source}} - {{title}}`

## Technical notes

The plugin uses the Hacker News API as the primary data source with HTML parsing as a fallback. All network requests use Obsidian's native API to bypass CORS restrictions.

Content is sanitized during HTML-to-Markdown conversion to prevent script injection and ensure safe rendering.