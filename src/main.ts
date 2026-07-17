import { App, Modal, Notice, Plugin, TFile, addIcon } from 'obsidian';
import { HNScraper, HNPostInfo } from './scraper';
import { CommentFormatter } from './formatter';
import { type HNCommentsSettings, DEFAULT_SETTINGS, HNCommentsSettingTab } from './settings';
import { INDICATOR_SVG, showNotice, generateNoticeFragment } from "./utils";

addIcon('indicator', INDICATOR_SVG);

export default class HackerNewsCommentsPlugin extends Plugin {
	settings!: HNCommentsSettings;

	async onload() {
		// console.log('Loading Hacker News Comments plugin');

		// Load settings
		await this.loadSettings();

		// Add a settings tab
		this.addSettingTab(new HNCommentsSettingTab(this.app, this));

		// Add a ribbon icon
		this.addRibbonIcon('message-square', 'Hacker News Comments', () => {
			new HNURLModal(this.app, (url) => {
				void this.handleFetchComments(url);
			}).open();
		});

		// Add a command
		this.addCommand({
			id: 'fetch-comments',
			name: 'Fetch comments',
			callback: () => {
				new HNURLModal(this.app, (url) => {
					void this.handleFetchComments(url);
				}).open();
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<HNCommentsSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// console.log('Unloading Hacker News Comments plugin');
	}

	private async handleFetchComments(url: string): Promise<void> {
		try {
			const fragment = generateNoticeFragment("Fetching Hacker News comments…", "loading");
			const loadingNotice = new Notice(fragment, 0);
			loadingNotice.containerEl.addClass("is-loading");

			const scraper = new HNScraper(this);
			const postInfo = await scraper.scrapeComments(url, loadingNotice);

			if (!postInfo.comments || postInfo.comments.length === 0) {
				loadingNotice.hide();
				showNotice("Error: No comments found or unable to parse the page.", 10000, 'error');
				return;
			}

			const formatter = new CommentFormatter(this.settings);
			const formattedContent = formatter.formatComments(postInfo, url);

			const fileName = this.generateFileName(url, postInfo);
			const file = await this.createNote(fileName, formattedContent);

			loadingNotice.hide();
			showNotice(`Created note: ${fileName}`, 5000, 'success');

			if (this.settings.openNoteAutomatically && file) {
				void this.app.workspace.getLeaf().openFile(file);
			}
		} catch (error) {
			console.error('Error processing Hacker News comments:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to process Hacker News comments';
			showNotice(`Error: ${errorMessage}`, 10000, 'error');
		}
	}

	private generateFileName(url: string, postInfo?: HNPostInfo): string {
		// Extract the story ID from the URL
		const match = url.match(/\/item\?id=(\d+)/);
		const postId = match ? match[1] : 'unknown';

		// Get current date and time
		const now = new Date();
		const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
		const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
		const datetime = `${date}-${time}`;

		// Get title from postInfo if available
		const title = postInfo?.title || 'Untitled';

		// Security: Safely extract and sanitize hostname
		let source = 'Hacker News';
		if (postInfo?.originalUrl) {
			try {
				const hostname = new URL(postInfo.originalUrl).hostname;
				source = this.sanitizeFilename(hostname);
			} catch {
				// Invalid URL, fallback to Hacker News
				source = 'Hacker News';
			}
		}

		// Get the template from settings
		let template = this.settings.filenameTemplate || 'HN - {{title}} - {{date}}';

		// Replace template variables (sanitize all user input)
		template = template
			.replace(/{{title}}/g, this.sanitizeFilename(title))
			.replace(/{{post-id}}/g, this.sanitizeFilename(postId))
			.replace(/{{date}}/g, date)
			.replace(/{{time}}/g, time)
			.replace(/{{datetime}}/g, datetime)
			.replace(/{{source}}/g, source);

		// Ensure the filename is valid
		let filename = this.sanitizeFilename(template);

		// Add .md extension if not present
		if (!filename.endsWith('.md')) {
			filename += '.md';
		}

		return filename;
	}

	private sanitizeFilename(input: string): string {
		// Security: Comprehensive filename sanitization
		return input
			.replace(/[\\/:*?"<>|]/g, '-')  // Replace Windows invalid chars
			.replace(/\.\./g, '--')          // Replace parent directory references
			.replace(/^\.+/, '')             // Remove leading dots
			.replace(/\s+/g, ' ')            // Replace multiple spaces
			.replace(/^\s+|\s+$/g, '')       // Trim whitespace
			.replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
			.substring(0, 200);              // Limit length
	}

	private async createNote(fileName: string, content: string): Promise<TFile | null> {
		// Check if file exists and append a number if it does
		let finalFileName = fileName;
		let counter = 1;
		
		while (await this.app.vault.adapter.exists(finalFileName)) {
			const nameParts = fileName.split('.');
			const extension = nameParts.pop();
			const baseName = nameParts.join('.');
			finalFileName = `${baseName} (${counter}).${extension}`;
			counter++;
		}
		
		// Create the file and return the TFile object
		return this.app.vault.create(finalFileName, content);
	}
}

class HNURLModal extends Modal {
	private url: string = '';
	private onSubmit: (url: string) => void;

	constructor(app: App, onSubmit: (url: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Enter Hacker News URL' });
		
		// Create input field
		const inputContainer = contentEl.createDiv({ cls: 'hn-url-input-container' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'https://news.ycombinator.com/item?id=...',
			cls: 'hn-url-input'
		});
		
		input.addEventListener('input', (e) => {
			this.url = (e.target as HTMLInputElement).value;
		});
		
        input.addEventListener("keydown", (event: KeyboardEvent) =>  {
          if (!event.shiftKey && event.key === "Enter") {
            this.onOK();
            event.preventDefault(); // Prevents the addition of a new line in the text field
          }
        });

		// Create buttons
		const buttonContainer = contentEl.createDiv({ cls: 'hn-button-container' });
		
		const submitButton = buttonContainer.createEl('button', { text: 'Fetch Comments' });
		submitButton.addEventListener('click', () => {
			if (!this.validateURL(this.url)) {
				new Notice('Please enter a valid Hacker News URL');
				return;
			}
			this.close();
			this.onSubmit(this.url);
		});
		
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
		
		// Focus the input field
		input.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	onOK() {
		if (!this.validateURL(this.url)) {
			new Notice('Please enter a valid Hacker News URL');
			return;
		}
		this.close();
		this.onSubmit(this.url);
	}
	
	private validateURL(url: string): boolean {
		// Basic validation to ensure it's a Hacker News URL
		return url.trim() !== '' &&
			(url.startsWith('https://news.ycombinator.com/') ||
			 url.startsWith('http://news.ycombinator.com/'));
	}
}