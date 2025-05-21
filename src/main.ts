import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, setIcon, addIcon } from 'obsidian';
import { HNScraper } from './scraper';
import { CommentFormatter } from './formatter';
import { HNCommentsSettings, DEFAULT_SETTINGS, HNCommentsSettingTab } from './settings';
import { INDICATOR_SVG, showNotice } from "./utils";

addIcon('indicator', INDICATOR_SVG);

export default class HackerNewsCommentsPlugin extends Plugin {
	settings: HNCommentsSettings;

	async onload() {
		// console.log('Loading HackerNews Comments plugin');

		// Load settings
		await this.loadSettings();

		// Add a settings tab
		this.addSettingTab(new HNCommentsSettingTab(this.app, this));

		// Add a ribbon icon
		this.addRibbonIcon('message-square', 'HackerNews Comments', () => {
			new HNURLModal(this.app, async (url) => {
				try {
					// Create a persistent notice that will stay visible until the process completes
					// let message: string = 'Fetching HackerNews comments…'
					const fragment = this.generateFragment("Fetching HackerNews comments…", "loading");
					
					const loadingNotice = new Notice(fragment, 0);

					const scraper = new HNScraper(this);
					const postInfo = await scraper.scrapeComments(url, loadingNotice);
					
					if (!postInfo.comments || postInfo.comments.length === 0) {
						loadingNotice.hide();
						// new Notice('No comments found or unable to parse the page.');
						showNotice("Error: No comments found or unable to parse the page.", 10000, 'error');
						return;
					}
					
					const formatter = new CommentFormatter(this.settings);
					const formattedContent = formatter.formatComments(postInfo, url);
					
					// Create a new note with the formatted comments
					const fileName = this.generateFileName(url, postInfo);
					const file = await this.createNote(fileName, formattedContent);
					
					// Hide the loading notice now that we're done
					loadingNotice.hide();
					
					showNotice(`Created note: ${fileName}`, 5000, 'success');
					
					// new Notice(`Created note: ${fileName}`);
					
					// Open the note automatically if the setting is enabled
					if (this.settings.openNoteAutomatically && file) {
						this.app.workspace.getLeaf().openFile(file);
					}
				} catch (error) {
					console.error('Error processing HackerNews comments:', error);
					showNotice(`Error: ${error.message || 'Failed to process HackerNews comments'}`, 10000, 'error');
				}
			}).open();
		});

		// Add a command
		this.addCommand({
			id: 'open-hackernews-comments-modal',
			name: 'Fetch HackerNews Comments',
			callback: () => {
				new HNURLModal(this.app, async (url) => {
					try {
						// Create a persistent notice that will stay visible until the process completes
						const fragment = this.generateFragment("Fetching HackerNews comments…", "loading");
					
						const loadingNotice = new Notice(fragment, 0);
						// const loadingNotice = new Notice('Fetching HackerNews comments...', 0);
						
						const scraper = new HNScraper(this);
						const postInfo = await scraper.scrapeComments(url, loadingNotice);
						
						if (!postInfo.comments || postInfo.comments.length === 0) {
							loadingNotice.hide();
							showNotice("Error: No comments found or unable to parse the page.", 10000, 'error');
							return;
						}
						
						const formatter = new CommentFormatter(this.settings);
						const formattedContent = formatter.formatComments(postInfo, url);
						
						// Create a new note with the formatted comments
						const fileName = this.generateFileName(url, postInfo);
						const file = await this.createNote(fileName, formattedContent);
						
						// Hide the loading notice now that we're done
						loadingNotice.hide();
						// new Notice(`Created note: ${fileName}`);
						showNotice(`Created note: ${fileName}`, 5000, 'success');
						
						// Open the note automatically if the setting is enabled
						if (this.settings.openNoteAutomatically && file) {
							this.app.workspace.getLeaf().openFile(file);
						}
					} catch (error) {
						console.error('Error processing HackerNews comments:', error);
						// new Notice(`Error: ${error.message || 'Failed to process HackerNews comments'}`);
						showNotice(`Error: ${error.message || 'Failed to process HackerNews comments'}`, 10000, 'error');
					}
				}).open();
			}
		});
	}

	generateFragment(message: string, type: string|undefined): DocumentFragment {

		const fragment = document.createDocumentFragment();

		let wrapper = fragment.createDiv({
			attr: {
				style: `display: flex; gap: .75em;`,
			}
		});

		if (type === 'error') {
			const header = wrapper.createDiv({
				attr: {
					style: `color: var(--color-red);`,
				},
			});
			setIcon(header, 'alert-triangle');
		}

		if (type === 'warning') {
			const header = wrapper.createDiv({
				attr: {
					style: `color: var(--color-yellow);`,
				},
			});
			setIcon(header, 'alert-triangle');
		}

		if (type === 'success') {
			const header = wrapper.createDiv({
				attr: {
					style: `color: var(--color-green);`,
				},
			});
			setIcon(header, 'check-circle');
		}

		if (type === 'info') {
			const header = wrapper.createDiv({
				attr: {
					style: `color: var(--color-blue);`,
				},
			});
			setIcon(header, 'info');
		}

		if (type === 'loading') {
			const header = wrapper.createDiv({
				attr: {
					cls: "indicator"
				}
			});
			setIcon(header, 'indicator');
		}

		wrapper.createDiv({
			text: message,
			attr: {
			style: ``,
			},
		});

		return fragment;

	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// console.log('Unloading HackerNews Comments plugin');
	}

	private generateFileName(url: string, postInfo?: any): string {
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
		
		// Get source (either the original URL or "HackerNews")
		const source = postInfo?.originalUrl ? new URL(postInfo.originalUrl).hostname : 'HackerNews';
		
		// Get the template from settings
		let template = this.settings.filenameTemplate || 'HN - {{title}} - {{date}}';
		
		// Replace template variables
		template = template
			.replace(/{{title}}/g, this.sanitizeFilename(title))
			.replace(/{{post-id}}/g, postId)
			.replace(/{{date}}/g, date)
			.replace(/{{time}}/g, time)
			.replace(/{{datetime}}/g, datetime)
			.replace(/{{source}}/g, this.sanitizeFilename(source));
		
		// Ensure the filename is valid
		let filename = this.sanitizeFilename(template);
		
		// Add .md extension if not present
		if (!filename.endsWith('.md')) {
			filename += '.md';
		}
		
		return filename;
	}
	
	private sanitizeFilename(input: string): string {
		// Replace invalid filename characters with safe alternatives
		return input
			.replace(/[\\/:*?"<>|]/g, '-') // Replace Windows invalid filename chars
			.replace(/\s+/g, ' ')          // Replace multiple spaces with single space
			.replace(/^\s+|\s+$/g, '')     // Trim leading/trailing spaces
			.substring(0, 200);            // Limit length to avoid too long filenames
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
		
		contentEl.createEl('h2', { text: 'Enter HackerNews URL' });
		
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
				new Notice('Please enter a valid HackerNews URL');
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
		this.onSubmit(this.url);
		this.close();
	}
	
	private validateURL(url: string): boolean {
		// Basic validation to ensure it's a HackerNews URL
		return url.trim() !== '' && 
			(url.startsWith('https://news.ycombinator.com/') || 
			 url.startsWith('http://news.ycombinator.com/'));
	}
}