# Status: Works for me

- Tested with [node](https://nodejs.org/en/) v8.5.0 and npm 5.4.0
- Recommended/commonly used versions should work too

## How to use
- Run `npm install` once
- Run program `node index.js` Example :
    - `node index.js -go` will genearte and open html file to browser
    - `node -l` will show list of channel user is subscribed to
    - `node -s https://youtube....` will subscribe to channel associated with the link

## Info
- `yt_sub_list.dat` is simple text file that rememebers channels to subscribe to
    - To manually edit the file:
        - Channel id (comes first) and channel name must be in pair sepearted in
          different lines
- `yt_view_subscription.html` is the generated html file
- Video datas are not saved for re-use. At each `generate` run of the program : reads what youtube gives (last n number of video data as atom feed) and generates html from that

As is. Made for personal use and learning.