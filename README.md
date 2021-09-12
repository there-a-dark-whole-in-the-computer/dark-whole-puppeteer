# Prerequisites

You need to install a local version of `node`. Just google "install node <os>" with your operating system. Tested on node v15.

# Installing it

Download the git repository and open up a command prompt and place it inside the folder.

```
npm install
```

This will download `dotenv` and `puppeteer` - both things are something we need.

After this you gotta make an `.env` file. The easiest way is to copy `.env.example` and name it `.env`.

Make sure to replace `USERNAME_PREFIX` in the config with nothing (`USERNAME_PREFIX=`) if you want it to use all your accounts.

# Remote debugging chrome

**WARNING**: To do this correctly chrome needs to NOT be running. You can force chrome to stop using `taskkill /F /IM chrome.exe` in your command prompt.

To make this work you need to launch chrome with an argument of `remote-debug-port`.

On my local Windows 10 computer, I had to run the following:

```
"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

Either use port 9222 like in the example above, or 

# Scripts

## `dislike`

### Description

This script will use ALL of your accounts and go through and dislike kadeems current live stream.

### Running it

```
npm run dislike-bot
```

## `ban-checker`

### Description

This script will use either all of your accounts or some of your accounts (if USERNAME_PREFIX is set in config) and post the messages from `bugging-messages.txt` (or BUGGING_MESSAGES_PATH if set in the config).

This is useful to figure out which accounts you long forgot about because they were timed out, but weren't actually ever banned.

**WARNING**: If you use real bugging messages in bugging-messages.txt there's a good chance the account will get banned.

### Running it

```
npm run dislike-bot
```
