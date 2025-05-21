import { type App, Setting, setIcon, PluginSettingTab } from 'obsidian';
import HackerNewsCommentsPlugin from 'src/main';
import { copyStringToClipboard } from "./utils";

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

		let descMomentFormat = document.createDocumentFragment();
		descMomentFormat.append(
			'Customize the date format for comment\'s timestamp. (default: YYYY-MM-DD, hh:mm:ss)',
			descMomentFormat.createEl('br'),
			descMomentFormat.createEl('br'),
			"Learn about available formatting tokens in the ",
			descMomentFormat.createEl("a", {
				href: "https://momentjs.com/docs/#/displaying/format/",
				text: "moment.js documentation",
				attr: { "aria-label": "https://momentjs.com/docs/#/displaying/format/", "data-tooltip-position": "top", "tabindex": '0' }
			}),
			"."
		);

		new Setting(containerEl)
			.setName('Timestamp format')
			.setDesc(descMomentFormat)
			.setClass("hn-timestamp-format-setting")
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD, hh:mm:ss')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}))
			.addExtraButton((component) => {
				component
					.setIcon("rotate-ccw")
					.setTooltip("Restore default format", { "placement": "left" })
					.onClick(async () => {
						if (confirm('Restore default format?')) {
							try {
								this.plugin.settings.dateFormat = DEFAULT_SETTINGS.dateFormat;
								await this.plugin.saveSettings();
								let input = activeDocument.querySelector('.hn-timestamp-format-setting .setting-item-control input[type="text"]') as HTMLInputElement | null;
								input!.value = DEFAULT_SETTINGS.dateFormat;
								// showNotice("Default note template restored", 3000, 'success');
							} catch (error) {
								console.error(error);
							}
						}
					})
					.extraSettingsEl.setAttribute('tabindex', '0');
			});

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
			.setDesc('Customize the filename for saved notes using template variables. (default: HN - {{title}} - {{date})')
			.setClass("hn-filename-template-setting")
			.addText(text => text
				.setPlaceholder('HN - {{title}} - {{date}}')
				.setValue(this.plugin.settings.filenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.filenameTemplate = value;
					await this.plugin.saveSettings();
				}))
			.addExtraButton((component) => {
				component
					.setIcon("rotate-ccw")
					.setTooltip("Restore default template", { "placement": "left" })
					.onClick(async () => {
						if (confirm('Restore default template?')) {
							try {
								this.plugin.settings.filenameTemplate = DEFAULT_SETTINGS.filenameTemplate;
								await this.plugin.saveSettings();
								let input = activeDocument.querySelector('.hn-filename-template-setting .setting-item-control input[type="text"]') as HTMLInputElement | null;
								input!.value = DEFAULT_SETTINGS.filenameTemplate;
							} catch (error) {
								console.error(error);
							}
						}
					})
					.extraSettingsEl.setAttribute('tabindex', '0');
			})
			.descEl.appendChild(createFragment((frag) => {
				frag.appendChild(document.createElement("br"));
				frag.appendChild(document.createElement("br"));
				frag.appendText("Available template variables (click or tab/enter to copy to clipboard)");

				// Add template variables documentation
				const templateHelp = containerEl.createEl('div', { cls: 'template-help' });
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
					li.addClass('hn-comments-template-vars');

					let iconEl = li.createSpan({ cls: 'copy-icon' });

					iconEl.setAttr("style", "margin-right: .3em;");
					setIcon(iconEl, "copy");

					let tpl = li.createEl('span', { text: v.name, cls: "tpl", attr: { "aria-label": "Click to copy" } });
					tpl.setAttribute('data-tooltip-position', 'top');
					tpl.setAttribute('tabindex', '0');
					tpl.insertAdjacentElement("afterbegin", iconEl);
					tpl.addEventListener("click", async () => {
						await copyStringToClipboard(v.name, v.name);
					});

					tpl.addEventListener('keydown', (evt) => {
						const keyDown = evt.key;
						if (keyDown === 'Enter' || (['Spacebar', ' '].indexOf(keyDown) >= 0)) {
							evt.preventDefault();
							tpl.click();
						}
					});

					li.createSpan({ text: ` - ${v.desc}` });
				});
			}));

			let restoreButtons = containerEl.querySelectorAll(".extra-setting-button");
			restoreButtons.forEach((element: HTMLElement) => {
				element.addEventListener('keydown', (evt: KeyboardEvent) => {
					const keyDown = evt.key;
					if (keyDown === 'Enter' || (['Spacebar', ' '].indexOf(keyDown) >= 0)) {
						evt.preventDefault();
						console.log(evt.targetNode);
						(evt.targetNode as HTMLElement).click();
					}
				});				
			});

	}
}