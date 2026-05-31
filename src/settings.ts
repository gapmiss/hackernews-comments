import { type App, Setting, PluginSettingTab } from 'obsidian';
import HackerNewsCommentsPlugin from 'src/main';

export interface HNCommentsSettings {
	enhancedLinks: boolean;
	dateFormat: string;
	openNoteAutomatically: boolean;
	filenameTemplate: string;
	wrapHtmlTags: boolean;
}

export const DEFAULT_SETTINGS: HNCommentsSettings = {
	enhancedLinks: false,
	dateFormat: "YYYY-MM-DD, hh:mm:ss",
	openNoteAutomatically: true,
	filenameTemplate: "HN - {{title}} - {{date}}",
	wrapHtmlTags: true
};

export class HNCommentsSettingTab extends PluginSettingTab {
	plugin: HackerNewsCommentsPlugin;

	constructor(app: App, plugin: HackerNewsCommentsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enhanced links')
			.setDesc('Enable enhanced links for usernames and timestamps in comments')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enhancedLinks)
				.onChange(async (value) => {
					this.plugin.settings.enhancedLinks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Timestamp format')
			.setDesc(createFragment((frag) => {
				frag.appendText("Customize the date format for comment's timestamp. (default: YYYY-MM-DD, hh:mm:ss)");
				frag.createEl('br');
				frag.createEl('br');
				frag.appendText("Learn about available formatting tokens in the ");
				frag.createEl("a", {
					href: "https://momentjs.com/docs/#/displaying/format/",
					text: "moment.js documentation",
					attr: { "aria-label": "https://momentjs.com/docs/#/displaying/format/", "data-tooltip-position": "top", "tabindex": "0" }
				});
				frag.appendText(".");
			}))
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD, hh:mm:ss')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Open note automatically')
			.setDesc('Automatically open newly created notes in the editor')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.openNoteAutomatically)
				.onChange(async (value) => {
					this.plugin.settings.openNoteAutomatically = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Wrap HTML tags in backticks')
			.setDesc('Automatically wrap HTML tags in backticks to prevent them from being interpreted as HTML')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.wrapHtmlTags)
				.onChange(async (value) => {
					this.plugin.settings.wrapHtmlTags = value;
					await this.plugin.saveSettings();
				}));

		const filenameSetting = new Setting(containerEl)
			.setName('Note filename template')
			.setDesc('Customize the filename for saved notes using template variables. (default: HN - {{title}} - {{date}})')
			.addText(text => text
				.setPlaceholder('HN - {{title}} - {{date}}')
				.setValue(this.plugin.settings.filenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.filenameTemplate = value;
					await this.plugin.saveSettings();
				}));

		filenameSetting.descEl.appendChild(createFragment((frag) => {
			frag.createEl('br');
			frag.createEl('br');
			frag.appendText("Available template variables:");

			const templateVars = [
				{ name: '{{title}}', desc: 'The Hacker News post title' },
				{ name: '{{post-id}}', desc: 'The Hacker News post ID' },
				{ name: '{{date}}', desc: 'The current date (YYYY-MM-DD format)' },
				{ name: '{{source}}', desc: 'The source URL or "Hacker News"' },
				{ name: '{{time}}', desc: 'The current time (HH-MM-SS format)' },
				{ name: '{{datetime}}', desc: 'The current date and time (YYYY-MM-DD-HH-MM-SS format)' }
			];

			templateVars.forEach(v => {
				const item = frag.createEl('p', { cls: 'hn-comments-template-vars' });
				item.createEl('code', { text: v.name });
				item.createSpan({ text: ` - ${v.desc}` });
			});
		}));
	}
}
