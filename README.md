A simple command line program to subscribe to youtube channels and
view link/thumbnail of videos in a locally generated html page. No
youtube/google account needed.

# Setup

+ Have [Node.js](https://nodejs.org/en/) installed (any version
  higher than 6 should be fine)
+ `git clone https://github.com/dxwc/youtube_subscriber.js`
+ `cd` into the cloned directory and run: `npm install`

# Use

+ See all available options and usages instruction by running:
  `node index.js --help`
+ Common Commands:
    + `node index.js --subscribe <a youtube video or channel url>`
    + `node index.js -upgo` to pull update (show progress) and then
       generate and open html with your default web browser
+ Recommended:
    + Use aliases. Example for linux OS: edit `~/.bashrc` file
      and add lines like:
        + `alias yt='cd /location/to/cloned/directory; clear; node index.js -upgo'`
            + Now to use, run from anywhere: `yt`
        + `alias sub='cd /location/to/cloned/directory; clear; node index.js --subscribe "$@"'`
            + Now to use, run from anywhere: `sub <a youtube video or channel url>`

# Features

+ Doesn't need any google account/API key
+ Latest videos are always on top (unlike youtube)
+ Doesn't randomly unsubscribe from some channel (unlike youtube)
+ Everything runs locally (and within a single directory)
+ Does exactly what is asked and only when it is asked (nothing runs in the background)
+ Generated HTML file contains no Javascript
+ Extracted data goes through basic validation and filters for XSS attack
+ It is easy to see where in the `index.js` to edit to change CSS to one's liking
  if default isn't preferable
+ Hovering a video tile on generated page shows channel name it belongs to
+ Hovering a video title on generate page shows video description
+ (new) Can now remove a subscription with `--remove` flag