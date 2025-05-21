import { Notice, addIcon, setIcon } from 'obsidian';

const INDICATOR_SVG: string = `<svg height="120" viewBox="0 0 135 140" xmlns="http://www.w3.org/2000/svg"><rect y="10" width="15" height="120" rx="6"><animate attributeName="height" begin="0.5s" dur="1s" values="120;110;100;90;80;70;60;50;40;140;120" calcMode="linear" repeatCount="indefinite" /><animate attributeName="y" begin="0.5s" dur="1s" values="10;15;20;25;30;35;40;45;50;0;10" calcMode="linear" repeatCount="indefinite" /></rect><rect x="30" y="10" width="15" height="120" rx="6"><animate attributeName="height" begin="0.25s" dur="1s" values="120;110;100;90;80;70;60;50;40;140;120" calcMode="linear" repeatCount="indefinite" /><animate attributeName="y" begin="0.25s" dur="1s" values="10;15;20;25;30;35;40;45;50;0;10" calcMode="linear" repeatCount="indefinite" /></rect><rect x="60" width="15" height="140" rx="6"><animate attributeName="height" begin="0s" dur="1s" values="120;110;100;90;80;70;60;50;40;140;120" calcMode="linear" repeatCount="indefinite" /><animate attributeName="y" begin="0s" dur="1s" values="10;15;20;25;30;35;40;45;50;0;10" calcMode="linear" repeatCount="indefinite" /></rect><rect x="90" y="10" width="15" height="120" rx="6"><animate attributeName="height" begin="0.25s" dur="1s" values="120;110;100;90;80;70;60;50;40;140;120" calcMode="linear" repeatCount="indefinite" /><animate attributeName="y" begin="0.25s" dur="1s" values="10;15;20;25;30;35;40;45;50;0;10" calcMode="linear" repeatCount="indefinite" /></rect><rect x="120" y="10" width="15" height="120" rx="6"><animate attributeName="height" begin="0.5s" dur="1s" values="120;110;100;90;80;70;60;50;40;140;120" calcMode="linear" repeatCount="indefinite" /><animate attributeName="y" begin="0.5s" dur="1s" values="10;15;20;25;30;35;40;45;50;0;10" calcMode="linear" repeatCount="indefinite" /></rect></svg>`;

addIcon('indicator', INDICATOR_SVG);

export function showNotice(message: string, duration:number = 4000, type: string|undefined): void {

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

  new Notice(fragment, duration);

}

export async function copyStringToClipboard(text:string, topic:string|undefined=undefined) {
  navigator.clipboard
    .writeText(text)
    .then(function () {
      showNotice((topic !== undefined ? topic + " " : "Text ") + "copied to clipboard", 2500, 'success');
    })
    .catch(function (error) {
      console.error('Failed to copy to clipboard: ', error)
    })
}