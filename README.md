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
+ Recommeded:
    + Use aliases. Example for linux OS: edit `~/.bashrc` file
      and add lines like:
        + `alias yt='cd /location/to/cloned/directory; clear; node index.js -upgo'`
            + Now to use, run from anywhere: `yt`
        + `alias sub='cd /location/to/cloned/directory; clear; node index.js --subscribe "$@"'`
            + Now to use, run from anywhere: `sub <a youtube video or channel url>`