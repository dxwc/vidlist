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

+ Fast
+ Doesn't need any google account/API key
+ Latest videos are always on top
+ Processings are done and data are all kept locally, nothing runs in the background
+ Generated HTML file contains no javascript
+ Basic validation and XSS protection are in place
+ It is easy to see where in the `index.js` to edit to change CSS to one's liking
+ Can easily add or remove channels from subscriptions
+ Can easily import or export subscription list as text (JSON) file

# Changelog

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

# Dependency Overview

NOTE: Nothing needs to be install separately, the instruction in
*setup* section above is all you need to install and use vidlist.

[vidlist](https://www.npmjs.com/package/vidlist) requires:

+ [entities](https://www.npmjs.com/package/entities) - requires: none
+ [moment](https://www.npmjs.com/package/moment) - requires: none
+ [node-getopt](https://www.npmjs.com/package/node-getopt) - requires: none
+ [opn](https://www.npmjs.com/package/opn) - requires: [is-wsl](https://www.npmjs.com/package/is-wsl) - requires: none
+ [sqlite3](https://www.npmjs.com/package/sqlite3) - requires: many
+ [validator](https://www.npmjs.com/package/validator) - requires: none
+ [xss-filters](https://www.npmjs.com/package/xss-filters) - requires: none

`npm ls` output:

```
├── entities@1.1.1
├── moment@2.21.0
├── node-getopt@0.2.3
├─┬ opn@5.2.0
│ └── is-wsl@1.1.0
├─┬ sqlite3@3.1.13
│ ├── nan@2.7.0
│ └─┬ node-pre-gyp@0.6.38
│   ├─┬ hawk@3.1.3
│   │ ├─┬ boom@2.10.1
│   │ │ └── hoek@2.16.3 deduped
│   │ ├─┬ cryptiles@2.0.5
│   │ │ └── boom@2.10.1 deduped
│   │ ├── hoek@2.16.3
│   │ └─┬ sntp@1.0.9
│   │   └── hoek@2.16.3 deduped
│   ├─┬ mkdirp@0.5.1
│   │ └── minimist@0.0.8
│   ├─┬ nopt@4.0.1
│   │ ├── abbrev@1.1.1
│   │ └─┬ osenv@0.1.4
│   │   ├── os-homedir@1.0.2
│   │   └── os-tmpdir@1.0.2
│   ├─┬ npmlog@4.1.2
│   │ ├─┬ are-we-there-yet@1.1.4
│   │ │ ├── delegates@1.0.0
│   │ │ └── readable-stream@2.3.3 deduped
│   │ ├── console-control-strings@1.1.0
│   │ ├─┬ gauge@2.7.4
│   │ │ ├── aproba@1.2.0
│   │ │ ├── console-control-strings@1.1.0 deduped
│   │ │ ├── has-unicode@2.0.1
│   │ │ ├── object-assign@4.1.1
│   │ │ ├── signal-exit@3.0.2
│   │ │ ├─┬ string-width@1.0.2
│   │ │ │ ├── code-point-at@1.1.0
│   │ │ │ ├─┬ is-fullwidth-code-point@1.0.0
│   │ │ │ │ └── number-is-nan@1.0.1
│   │ │ │ └── strip-ansi@3.0.1 deduped
│   │ │ ├─┬ strip-ansi@3.0.1
│   │ │ │ └── ansi-regex@2.1.1
│   │ │ └─┬ wide-align@1.1.2
│   │ │   └── string-width@1.0.2 deduped
│   │ └── set-blocking@2.0.0
│   ├─┬ rc@1.2.1
│   │ ├── deep-extend@0.4.2
│   │ ├── ini@1.3.4
│   │ ├── minimist@1.2.0
│   │ └── strip-json-comments@2.0.1
│   ├─┬ request@2.81.0
│   │ ├── aws-sign2@0.6.0
│   │ ├── aws4@1.6.0
│   │ ├── caseless@0.12.0
│   │ ├─┬ combined-stream@1.0.5
│   │ │ └── delayed-stream@1.0.0
│   │ ├── extend@3.0.1
│   │ ├── forever-agent@0.6.1
│   │ ├─┬ form-data@2.1.4
│   │ │ ├── asynckit@0.4.0
│   │ │ ├── combined-stream@1.0.5 deduped
│   │ │ └── mime-types@2.1.17 deduped
│   │ ├─┬ har-validator@4.2.1
│   │ │ ├─┬ ajv@4.11.8
│   │ │ │ ├── co@4.6.0
│   │ │ │ └─┬ json-stable-stringify@1.0.1
│   │ │ │   └── jsonify@0.0.0
│   │ │ └── har-schema@1.0.5
│   │ ├── hawk@3.1.3 deduped
│   │ ├─┬ http-signature@1.1.1
│   │ │ ├── assert-plus@0.2.0
│   │ │ ├─┬ jsprim@1.4.1
│   │ │ │ ├── assert-plus@1.0.0
│   │ │ │ ├── extsprintf@1.3.0
│   │ │ │ ├── json-schema@0.2.3
│   │ │ │ └─┬ verror@1.10.0
│   │ │ │   ├── assert-plus@1.0.0
│   │ │ │   ├── core-util-is@1.0.2 deduped
│   │ │ │   └── extsprintf@1.3.0 deduped
│   │ │ └─┬ sshpk@1.13.1
│   │ │   ├── asn1@0.2.3
│   │ │   ├── assert-plus@1.0.0
│   │ │   ├─┬ bcrypt-pbkdf@1.0.1
│   │ │   │ └── tweetnacl@0.14.5 deduped
│   │ │   ├─┬ dashdash@1.14.1
│   │ │   │ └── assert-plus@1.0.0
│   │ │   ├─┬ ecc-jsbn@0.1.1
│   │ │   │ └── jsbn@0.1.1 deduped
│   │ │   ├─┬ getpass@0.1.7
│   │ │   │ └── assert-plus@1.0.0
│   │ │   ├── jsbn@0.1.1
│   │ │   └── tweetnacl@0.14.5
│   │ ├── is-typedarray@1.0.0
│   │ ├── isstream@0.1.2
│   │ ├── json-stringify-safe@5.0.1
│   │ ├─┬ mime-types@2.1.17
│   │ │ └── mime-db@1.30.0
│   │ ├── oauth-sign@0.8.2
│   │ ├── performance-now@0.2.0
│   │ ├── qs@6.4.0
│   │ ├── safe-buffer@5.1.1
│   │ ├── stringstream@0.0.5
│   │ ├─┬ tough-cookie@2.3.3
│   │ │ └── punycode@1.4.1
│   │ ├─┬ tunnel-agent@0.6.0
│   │ │ └── safe-buffer@5.1.1 deduped
│   │ └── uuid@3.1.0
│   ├─┬ rimraf@2.6.2
│   │ └─┬ glob@7.1.2
│   │   ├── fs.realpath@1.0.0
│   │   ├─┬ inflight@1.0.6
│   │   │ ├── once@1.4.0 deduped
│   │   │ └── wrappy@1.0.2 deduped
│   │   ├── inherits@2.0.3 deduped
│   │   ├─┬ minimatch@3.0.4
│   │   │ └─┬ brace-expansion@1.1.8
│   │   │   ├── balanced-match@1.0.0
│   │   │   └── concat-map@0.0.1
│   │   ├── once@1.4.0 deduped
│   │   └── path-is-absolute@1.0.1
│   ├── semver@5.4.1
│   ├─┬ tar@2.2.1
│   │ ├─┬ block-stream@0.0.9
│   │ │ └── inherits@2.0.3 deduped
│   │ ├─┬ fstream@1.0.11
│   │ │ ├── graceful-fs@4.1.11
│   │ │ ├── inherits@2.0.3 deduped
│   │ │ ├── mkdirp@0.5.1 deduped
│   │ │ └── rimraf@2.6.2 deduped
│   │ └── inherits@2.0.3
│   └─┬ tar-pack@3.4.0
│     ├─┬ debug@2.6.9
│     │ └── ms@2.0.0
│     ├── fstream@1.0.11 deduped
│     ├─┬ fstream-ignore@1.0.5
│     │ ├── fstream@1.0.11 deduped
│     │ ├── inherits@2.0.3 deduped
│     │ └── minimatch@3.0.4 deduped
│     ├─┬ once@1.4.0
│     │ └── wrappy@1.0.2
│     ├─┬ readable-stream@2.3.3
│     │ ├── core-util-is@1.0.2
│     │ ├── inherits@2.0.3 deduped
│     │ ├── isarray@1.0.0
│     │ ├── process-nextick-args@1.0.7
│     │ ├── safe-buffer@5.1.1 deduped
│     │ ├─┬ string_decoder@1.0.3
│     │ │ └── safe-buffer@5.1.1 deduped
│     │ └── util-deprecate@1.0.2
│     ├── rimraf@2.6.2 deduped
│     ├── tar@2.2.1 deduped
│     └── uid-number@0.0.6
├── validator@9.4.1
└── xss-filters@1.2.7
```

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
