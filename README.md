A simple command line program to subscribe to youtube channels and
view link/thumbnail of videos in a locally generated html page. No
youtube/google account needed.

# Setup

1. Have [Node.js](https://nodejs.org/en/) installed (any version
  higher than 6 should be fine)
2. Run `npm install -g subscribe` or `sudo npm install -g subscribe`

# Use

+ Run and see `sub --help`

# Common Usages Example

### Subscribe to a youtube channel:

`sub -s https://www.youtube.com/watch?v=EeNiqKNtpAA`

### Pull update from channel feed, show update progress, generate HTML and then open the HTML with your default browser:

`sub -upgo`

# Want to start with my recommended list of channels ?

1. Save [this file](https://raw.githubusercontent.com/dxwc/subscribe/files/subscriptions.json) somewhere on your computer.
2. Run `sub --import /location/to/subscriptions.json`

# Features

+ Fast
+ Doesn't need any google account/API key
+ Latest videos are always on top
+ Everything kept locally and nothing runs in the background
+ Generated HTML file contains no Javascript
+ Basic validation and XSS protection are in place
+ It is easy to see where in the `index.js` to edit to change CSS to one's liking
+ Tile hover shows channel name, title hover shows video description
+ Can easily export and import subscription as text (JSON) file
+ Can easily remove particular subscriptions

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