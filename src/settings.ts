import { type App, PluginSettingTab, Setting } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import HackerNewsCommentsPlugin from './main';

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

	getSettingDefinitions(): SettingDefinitionItem<keyof HNCommentsSettings>[] {
		return [
			{
				name: 'Enhanced links',
				desc: 'Enable enhanced links for usernames and timestamps in comments.',
				control: { type: 'toggle', key: 'enhancedLinks' },
			},
			{
				name: 'Timestamp format',
				desc: createFragment((frag) => {
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
				}),
				control: {
					type: 'text',
					key: 'dateFormat',
					defaultValue: 'YYYY-MM-DD, hh:mm:ss',
					placeholder: 'YYYY-MM-DD, hh:mm:ss',
				},
			},
			{
				name: 'Open note automatically',
				desc: 'Automatically open newly created notes in the editor.',
				control: { type: 'toggle', key: 'openNoteAutomatically' },
			},
			{
				name: 'Wrap HTML tags in backticks',
				desc: 'Automatically wrap HTML tags in backticks to prevent them from being interpreted as HTML.',
				control: { type: 'toggle', key: 'wrapHtmlTags' },
			},
			{
				name: 'Note filename template',
				render: (setting: Setting) => {
					setting.setDesc(createFragment((frag) => {
						frag.appendText("Customize the filename for saved notes using template variables. (default: HN - {{title}} - {{date}})");
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

					setting.addText(text => text
						.setPlaceholder('HN - {{title}} - {{date}}')
						.setValue(this.plugin.settings.filenameTemplate)
						.onChange(async (value) => {
							this.plugin.settings.filenameTemplate = value;
							await this.plugin.saveSettings();
						}));
				},
			},
		];
	}
}
