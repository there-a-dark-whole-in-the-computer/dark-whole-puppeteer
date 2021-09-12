const puppeteer = require('puppeteer-core');

if (!process.env.PUPPETEER_REMOTE_PORT) {
	throw new Error('PUPPETEER_REMOTE_PORT is not set');
}

(async () => {
	let clickXPath = (async (page, clickXpath) => {
		// Wait for the button to appear
		await page.waitForXPath(clickXpath, { visible: true })

		// Find the button
		const [button] = await page.$x(clickXpath)

		// Click the button
		await button.click();
	});

	const xpath = {
		btnSwitchAccounts: "//yt-formatted-string[contains(., 'Switch account')]",
		btnDislike: "//button[starts-with(@aria-label, 'dislike')]",
	};

	const browserURL = 'http://127.0.0.1:' + process.env.PUPPETEER_REMOTE_PORT;
	const browser = await puppeteer.connect({
		headless: false,
		defaultViewport: null,
		browserURL
	});

	let accountMatcher = (accountName) => {
		//return true; // All accounts

		// Only accounts beginning with "Pigeon"
		return accountName.match(/^Pigeon/);
	};

	let dislikedAccountNames = [];

	let dislikeNext;

	dislikeNext = async () => {
		try {
			const page = await browser.newPage();

			// Open up kadeems live stream
			console.log('Opening stream so we can dislike..');
			await page.goto('https://www.youtube.com/channel/UCEFAABMSOc3GIhfaO3BdA3A/live', {
				waitUntil: 'networkidle2',
			});

			// Click dislike
			console.log('Clicking dislike button..');
			let dislikeButton = await page.$('button#button[aria-label^="dislike"]');

			await dislikeButton.evaluate((b) => {
				b.click()
			});

			console.log('Clicking avatar button..');
			// Click avatar button to change user
			await page.click('#avatar-btn');

			console.log('Clicking switch accounts button..');
			// Click switch accounts button and wait for the list to render
			await clickXPath(page, xpath.btnSwitchAccounts);
			await page.waitForSelector('ytd-account-item-renderer')

			console.log('Fetching list of accounts..');
			let ytdAccountItemRenderers = await page.$$('ytd-account-item-renderer');

			let dislikeAccountName, dislikeAccountYtRenderer;

			// Loop through all accounts
			for (let i = 0, len = ytdAccountItemRenderers.length; i < len; i++) {
				const ytdAccountItemRenderer = ytdAccountItemRenderers[i];

				// Get channel title
				const channelNameElement = await ytdAccountItemRenderer.$('#channel-title');

				let channelName = await channelNameElement.evaluate((el) => {
					return el.textContent;
				});

				// Remove newlines
				channelName = channelName.replace(/^\s+|\s+$/g, '');

				if (!accountMatcher(channelName)) {
					// Skip this account as we do not want it

					console.log(`Ignored account ${channelName}`);

					continue;
				}

				if (!dislikedAccountNames.includes(channelName)) {
					dislikeAccountName = channelName;
					dislikeAccountYtRenderer = ytdAccountItemRenderer;

					break;
				}
			}

			if (dislikeAccountName) {
				console.log(`Found unliked account: ${dislikeAccountName} - changing to it..`);

				dislikedAccountNames.push(dislikeAccountName);

				//console.log('Waiting for the page to reload with the new account..');
				await dislikeAccountYtRenderer.click();

				// Wait until the account is switched
				await page.waitForNavigation({
					waitUntil: 'networkidle2',
				});

				// Close the page (for some reason we can't reuse it)
				await page.close();

				// Rinse and repeat
				dislikeNext();
			} else {
				console.log('No more accounts found');
			}
		} catch (e) {
			console.log('Something went wrong - starting over..');

			dislikeNext();
		}
	};

	dislikeNext();
})();
