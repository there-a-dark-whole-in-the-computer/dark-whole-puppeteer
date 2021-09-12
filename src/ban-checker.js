const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.BUGGING_MESSAGES_FILE) {
	throw new Error('BUGGING_MESSAGES_FILE is not set');
}

if (!process.env.PUPPETEER_REMOTE_PORT) {
	throw new Error('PUPPETEER_REMOTE_PORT is not set');
}

// Read all the bugging messages
let buggingMessagesRaw = fs.readFileSync(path.join(__dirname, '..', process.env.BUGGING_MESSAGES_FILE), { encoding: 'utf8' });

let buggingMessages = buggingMessagesRaw.toString().split(/\s*[\r\n]+\s*/g);

buggingMessages = buggingMessages.filter((string) => {
	return !!string;
});

console.log(`Found ${buggingMessages.length} bugging messages`);

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
		btnSwitchAccounts: "//yt-formatted-string[contains(., 'Switch account')]"
	};

	const browserURL = 'http://127.0.0.1:' + process.env.PUPPETEER_REMOTE_PORT;
	const browser = await puppeteer.connect({
		headless: false,
		defaultViewport: null,
		browserURL
	});

	let accountMatcher = (accountName) => {
		let usernamePrefix = process.env.USERNAME_PREFIX;

		if (usernamePrefix) {
			return accountName.substr(0, usernamePrefix.length) === usernamePrefix;
		} else {
			return true; // All accounts
		}
	};

	let checkedAccountNames = [];

	let checkNext;

	checkNext = async () => {
		try {
			const page = await browser.newPage();

			// Open up kadeems live stream
			console.log('Opening stream to interact..');
			await page.goto('https://www.youtube.com/channel/UCEFAABMSOc3GIhfaO3BdA3A/live', {
				waitUntil: 'networkidle2',
			});

			// The chat box is inside an iframe, let's find it first
			console.log('Finding chat box iframe..');
			let frames = await page.frames();
			let liveChatFrame;

			frames.find((frame) => {
				if (frame.url().indexOf('live_chat') >= 0) {
					liveChatFrame = frame;
				}
			});

			if (!liveChatFrame) {
				throw new Error('Could not find live chat frame');
			}

			// Find the username we're posting with
			let inputChatAuthor = await liveChatFrame.waitForSelector('yt-live-chat-message-input-renderer yt-live-chat-author-chip');
			let inputChatAuthorName = await inputChatAuthor.evaluate((el) => {
				return el.textContent.replace(/^\s+|\s+$/g, '')
			});

			if (accountMatcher(inputChatAuthorName)) {
				console.log('Waiting for input field..');
				let inputChatMessage = await liveChatFrame.waitForSelector('yt-live-chat-message-input-renderer div#input[contenteditable]');

				let inputMessage = buggingMessages[Math.floor(buggingMessages.length * Math.random())];
				console.log(`Posting message "${inputMessage}"`);

				await inputChatMessage.evaluate((input, inputMessage) => {
					input.focus();

					input.textContent = inputMessage;

					input.dispatchEvent(new Event('input'));
				}, inputMessage);

				let sendButton = await liveChatFrame.waitForSelector('button#button[aria-label="Send"]');

				await sendButton.evaluate((el) => {
					el.click();
				});

				checkedAccountNames.push(inputChatAuthorName);
			}

			console.log('Clicking avatar button..');
			// Click avatar button to change user
			await page.click('#avatar-btn');

			console.log('Clicking switch accounts button..');
			// Click switch accounts button and wait for the list to render
			await clickXPath(page, xpath.btnSwitchAccounts);
			await page.waitForSelector('ytd-account-item-renderer')

			console.log('Fetching list of accounts..');
			let ytdAccountItemRenderers = await page.$$('ytd-account-item-renderer');

			let checkAccountName, checkAccountYtRenderer;

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

				if (!checkedAccountNames.includes(channelName)) {
					checkAccountName = channelName;
					checkAccountYtRenderer = ytdAccountItemRenderer;

					break;
				}
			}

			if (checkAccountName) {
				console.log(`Found unchecked account: ${checkAccountName} - changing to it..`);

				checkedAccountNames.push(checkAccountName);

				//console.log('Waiting for the page to reload with the new account..');
				await checkAccountYtRenderer.click();

				// Wait until the account is switched
				await page.waitForNavigation({
					waitUntil: 'networkidle2',
				});

				// Close the page (for some reason we can't reuse it)
				await page.close();

				// Rinse and repeat
				checkNext();
			} else {
				console.log('No more accounts found');
			}
		} catch (e) {
			// Start over, something went wrong
			console.log('Something went wrong - starting over..');

			await page.close();

			checkNext();
		}
	};

	checkNext();
})();
