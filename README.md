A simple command line program to subscribe to youtube channels and
view thumbnail links of videos in a locally generated html page. No
youtube/google account needed.

<p align='center'>
    <img src='https://img.shields.io/david/dxwc/vidlist.svg?style=for-the-badge'>
    <img src='https://img.shields.io/npm/dt/vidlist.svg?style=for-the-badge'>
    <img src='https://img.shields.io/npm/v/vidlist.svg?style=for-the-badge'>
</p>

<p align='center'>
    <img width='501px' src='https://raw.githubusercontent.com/dxwc/vidlist/files/vidlist.png'>
</p>

# Install

1. Have [Node.js](https://nodejs.org/en/) installed (any version
   higher than 6 should be fine)
2. Run command **`npm install -g vidlist@latest`** and you are all set
    + To update run `npm update -g vidlist`
    + To uninstall, run `npm uninstall -g vidlist`
    + _Unix may need `sudo` before commands_
    + _Windows may need running as admistrator_

# Use

+ Run and see `vl --help`
+ **Note**: The program will run the same with the names: `vidlist`, `vl` or `sub`

# Common Usages Example

**Subscribe to a youtube channel:**

`vl https://www.youtube.com/watch?v=EeNiqKNtpAA`

or

`vl -s https://www.youtube.com/watch?v=EeNiqKNtpAA`

**Pull update from channel feed, show update progress, generate HTML and then open the HTML with your default browser:**

`vl -upgo`

**Generated HTML use**

+ Clicking on thumbnail takes to full width video embed link
+ Clicking on video title takes to normal youtube video view link
+ Hovering over channel name shows time since video published
+ Hovering over video title shows video description text
+ Channel list and links will be on the bottom of the page

**Want to start with my recommended list of channels ?**

1. Save [this file](https://raw.githubusercontent.com/dxwc/subscribe/files/subscriptions.json) somewhere on your computer.
2. Run: `vl --import <location name of the downloaded file>`

# Features

+ Doesn't need any google account/API key
+ Latest videos are always on top
+ Everything runs and kept locally, no background processing
+ Does not require frontend javascript
+ Thumbnail image lazy-loading after first 10
+ Basic validation and XSS protection are in place
+ It is easy to see where in the `index.js` to edit to change CSS to one's liking
+ Can easily import or export subscription list as text (JSON) file

# Changelog
+ 2.0.0
    + Fixed broken subscription option after youtube update
    + Updated packages
+ 1.1.0
    + Added thumbnail lazy-loading after first 10
+ 1.0.2
    + YouTube watch/user/channel/embed/shortcut URL are all correctly supported for
     subscribing
    + Better channel removal confirmation
+ 1.0.1
    + Dependency package versions updated
    + Progress text change bug fixed
+ 1.0.0
    + Identical to previous version 0.1.2, now following npm semantic
      versioning
+ 0.1.2
    + Fix bug that was causing channel name mismatch since 0.1.0
+ 0.1.1
    + --one multiple update status counter fix with -p
+ 0.1.0
    + Print status text on individual subscription
    + Open option will not wait for browser to close after opening the html
      on non-windows platforms if the open option was invoked when the
      default browser was not open already
    + Fixed channel name printing on console containing html entities
    + Added option to fetch updates from specific channel/s at a time
    + Fixed description text not being displayed properly on special characters
    + Fixed a minor wrongly ordered set of operations during subscribing
+ 0.0.9
    + Fixed html not opening in windows issue
+ 0.0.8
    + CSS changed
    + Channel name is now part of video tile instead of hover
    + Channel name hover displays relative time since video published
    + Fixed channel name escaping issue
    + Thumbnail embed link autoplays on click
    + Uses youtube.com instead of youtube-nocookie.com for embed link
+ 0.0.7
    + Prevent potential running of 'open' command until browser closes
+ 0.0.6
    + Minor progress/help texts fixes

----

This software was not produced by or directly for YouTube, LLC and has no
affiliation with the LLC. Use this software only at your own volition.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
