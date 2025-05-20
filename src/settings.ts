import { type App, Setting, PluginSettingTab } from 'obsidian';
import HackerNewsCommentsPlugin from 'src/main';

export interface HNCommentsSettings {
    enhancedLinks: boolean;
    openNoteAutomatically: boolean;
    filenameTemplate: string;
    wrapHtmlTags: boolean;
}

export const DEFAULT_SETTINGS: HNCommentsSettings = {
    enhancedLinks: false,
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

		// containerEl.createEl('h2', { text: 'HackerNews Comments Settings' });

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
				
		new Setting(containerEl)
			.setName('Note filename template')
			.setDesc('Customize the filename for saved notes using template variables: {{title}}, {{post-id}}, {{date}}, {{source}}')
			.addText(text => text
				.setPlaceholder('HN - {{title}} - {{date}}')
				.setValue(this.plugin.settings.filenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.filenameTemplate = value;
					await this.plugin.saveSettings();
				}));
        

        new Setting(containerEl)
			.setName('Available template variables')
		// Add template variables documentation
		const templateHelp = containerEl.createEl('div', { cls: 'template-help' });
		// templateHelp.createEl('h6', { text: 'Available template variables' });
		
		const templateVars = [
			{ name: '{{title}}', desc: 'The HackerNews post title' },
			{ name: '{{post-id}}', desc: 'The HackerNews post ID' },
			{ name: '{{date}}', desc: 'The current date (YYYY-MM-DD format)' },
			{ name: '{{source}}', desc: 'The source URL or "HackerNews"' },
			{ name: '{{time}}', desc: 'The current time (HH-MM-SS format)' },
			{ name: '{{datetime}}', desc: 'The current date and time (YYYY-MM-DD-HH-MM-SS format)' }
		];
		
		const div = templateHelp.createEl('div');
		templateVars.forEach(v => {
			const li = div.createEl('p');
            li.style = "margin:0px;padding:0px;font-size:var(--font-ui-small);";
			li.createEl('em', { text: v.name });
			li.createSpan({ text: ` - ${v.desc}` });
		});
	}
}