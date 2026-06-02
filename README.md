# Hacker News Comments

An Obsidian plugin that fetches and saves Hacker News comments as Markdown notes.

## Features

- Fetch comments from any Hacker News post
- Threaded comment formatting with proper indentation
- Metadata included: post title, original URL, comment count
- Customizable note filenames using template variables
- Optional enhanced links for usernames and timestamps
- Automatic HTML-to-Markdown conversion

## Installation

[Install from community.obsidian.md](https://community.obsidian.md/plugins/hackernews-comments)

From Obsidian's settings or preferences:

1. Community Plugins > Browse
2. Search for "Hacker News Comments"

Manually:

1. download the latest [release](https://github.com/gapmiss/hackernews-comments/releases/latest) archive
2. uncompress the downloaded archive
3. move the `hackernews-comments` folder to `/path/to/vault/.obsidian/plugins/` 
4.  Settings > Community plugins > reload **Installed plugins**
5.  enable plugin

or:

1.  download `main.js`, `manifest.json` & `styles.css` from the latest [release](https://github.com/gapmiss/hackernews-comments/releases/latest)
2.  create a new folder `/path/to/vault/.obsidian/plugins/hackernews-comments`
3.  move all 3 files to `/path/to/vault/.obsidian/plugins/hackernews-comments`
4.  Settings > Community plugins > reload **Installed plugins**
5.  enable plugin

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