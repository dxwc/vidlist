A simple command line program to subscribe to youtube channels and
view thumbnail links of videos in a locally generated html page. No
youtube/google account needed.

# Setup

1. Have [Node.js](https://nodejs.org/en/) installed (any version
   higher than 6 should be fine)
2. Run command `npm install -g vidlist` and you are all set
    + To update to latest version anytime after installation, re-run above command
    + To uninstall, run `npm uninstall -g vidlist`
    + _Unix may need `sudo` before commands_
    + _Windows may need running cmd as admistrator_

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

**Want to start with my recommended list of channels ?**

1. Save [this file](https://raw.githubusercontent.com/dxwc/subscribe/files/subscriptions.json) somewhere on your computer.
2. Run: `vl --import <location name of the downloaded file>`

# Features

+ Fast
+ Doesn't need any google account/API key
+ Latest videos are always on top
+ Processings are done and data are all kept locally, nothing runs in the background
+ Generated HTML file contains no javascript
+ Basic validation and XSS protection are in place
+ It is easy to see where in the `index.js` to edit to change CSS to one's liking
+ Channel name infomration per video, title hover shows video description
+ Can easily add or remove channels from subscriptions
+ Can easily import or export subscription list as text (JSON) file

# Changelog

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
