const fs      = require('fs');
const opn     = require('opn');
const FeedMe  = require('feedme');
const request = require('request');
const Getopt  = require('node-getopt');

"use strict";

//------------------------------------------------------------------------

let getopt = new Getopt([
  ['s', 'subscribe=ARG', 'Subscribes to youtube channel given a video/channel url'],
  ['g', 'generate', 'Generates yt_view_subscription.html in current directory'],
  ['o', 'open', 'Open generated html file in default browser'],
  ['l', 'list', 'Read yt_sub_list.dat in current directory and show subscription lists'],
  ['h', 'help', 'Display this help']
])
.bindHelp()
.error(() =>
{
    console.info('Invalid option\n', getopt.getHelp());
    process.exit(1);
});

let opt = getopt.parse(process.argv.slice(2));
if(process.argv.length <= 2)
{
    console.info(getopt.getHelp());
    process.exit(0);
}

//------------------------------------------------------------------------

console.log('-- Reading and parsing subscription list from yt_sub_list.dat file');

if(!fs.existsSync('./yt_sub_list.dat'))
{
    console.log('-- No yt_sub_list.dat file found, created one, ready to subscribe');
    fs.openSync('./yt_sub_list.dat', 'w');
}
const sub_list = fs
                .readFileSync('yt_sub_list.dat')
                .toString()
                .split('\n')
                .filter((val) => val != '');

console.assert(sub_list.length%2 === 0, '(corrupt) Data array length is not even');

//------------------------------------------------------------------------

if(opt.options.list) print_sub_list();
if(opt.options.generate && opt.options.open)
{
    generate_page()
    .then(() =>
    {
        console.log(
            '-- Opening file yt_view_subscription.html to your default browser');
        opn('./yt_view_subscription.html');
    })
    .catch((err) => console.log('Error', err));
}
else if(opt.options.generate)
{
    generate_page()
    .catch((err) => console.log('Error', err));
}
else if(opt.options.open)
{
    console.log('-- Opening file yt_view_subscription.html to your default browser');
    opn('./yt_view_subscription.html');
}
if(opt.options.subscribe) subscribe(opt.options.subscribe);

//------------------------------------------------------------------------

let feed_data = [];

const html_pre =
    "<!DOCTYPE html>" +
    "\n<html>" +
    "\n<head>" +
    "\n<meta charset='UTF-8'>" +
    "\n<title>Subscription</title>" +
    "\n<style type=\"text/css\">" +
    "\nbody{background-color: #B4B4B4;}" +
    "\nh2{font-size: 100%; overflow: hidden;}" +
    "\nimg{width: 100%;}" +
    "\na{" +
    "\ntext-decoration: none;" +
    "\ncolor: #333;" +
    "\nfont-weight: bold;" +
    "\n}" +
    "\n#contain" +
    "\n{" +
    "\nfloat: left;" +
    "\npadding-left: 2%;" +
    "\npadding-right: 2%;" +
    "\nwidth: 19.77%;" +
    "\nbackground-color: #ddd;" +
    "\npadding-top: 2%;" +
    "\nmargin-left: 1%;" +
    "\nmargin-bottom: 1%;" +
    "\nheight: 298px;" +
    "\noverflow: auto;" +
    "\n}" +
    "\n</style>" +
    "\n</head>" +
    "\n<body>\n\n";
const html_post =
    "\n</body>" +
    "\n</html>";
const section_a =
    "\n<div id=\"contain\">" +
    "\n<a href=\"https://www.youtube.com/embed/";
const section_b = "?rel=0\">";
const section_c =
    "\n<img src=\"https://img.youtube.com/vi/";
const section_d =
    "/mqdefault.jpg\" >" +
    "</a>" +
    "\n<a href=\"https://www.youtube.com/watch?v=";
const section_e = "\">\n<h2>";
const section_f = "</h2></a>\n</div>\n\n";

var full = "";

//------------------------------------------------------------------------

function print_sub_list()
{
    for(let i = 0; i < sub_list.length; i+=2)
    {
        console.log(sub_list[i], sub_list[i+1]);
    }
}

function download_one(ch_id, ch_name)
{
    return new Promise((resolve, reject) =>
    {
        let parser = new FeedMe(true);
        request(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch_id}`)
        .pipe(parser);
        parser.on('end', () =>
        {
            let ch_feed = parser.done().items;
            for(let k = 0; k < ch_feed.length; ++k)
            {
                feed_data.push
                (
                    {
                        vidId : ch_feed[k]["yt:videoid"],
                        vidTitle : ch_feed[k].title,
                        vidDate : new Date(ch_feed[k].published).getTime()/1000,
                        vidChannel : ch_name
                    }
                )
            }
            resolve();
        });
    });
}

function parse_and_collect()
{
    let all_downloaded = Promise.resolve();

    let r_length = 0;
    for(let i = 0; i < sub_list.length; i+=2)
    {
        if(sub_list[i+1].length > r_length)
        {
            r_length = sub_list[i+1].length;
        }
    }
    r_length += (`${sub_list.length/2}`.length * 2) + 10;

    console.log('\r-- Downloading channel feeds');

    for(let i = 0; i < sub_list.length; i += 2)
    {
        all_downloaded = all_downloaded
        .then(() =>
        {
            stat_next = `\r\t${i/2+1} of ${sub_list.length/2} : '${sub_list[i+1]}'`;
            process.stdout.write(`\r\t${' '.repeat(r_length)}`);
            process.stdout.write(stat_next);

            return download_one(sub_list[i], sub_list[i+1]);
        })
        .catch((err) =>
        {
            console.log('Error', err);
            return download_one(sub_list[i], sub_list[i+1]);
        });
        process.stdout.write(`\r\t${' '.repeat(r_length)}`);
    }

    return all_downloaded;
}

function generate_page()
{
    return new Promise((resolve, reject) =>
    {
        parse_and_collect()
        .then(() =>
        {
            console.log('\r-- Sorting videos by publication date');
            feed_data = feed_data.sort(
                (a, b) => { return a.vidDate < b.vidDate ? 1 : -1 });

            full = html_pre;
            console.log('-- Generating HTML file')
            for(let i = 0; i < feed_data.length; ++i)
            {
                let a_id = feed_data[i].vidId;
                let a_title = feed_data[i].vidTitle;

                full += section_a;
                full += a_id; // id
                full += section_b;
                full += section_c;
                full += a_id;
                full += section_d;
                full += a_id;
                full += section_e;
                full += a_title; // title
                full += section_f;
            }

            full += html_post;

            require('fs').writeFile("./yt_view_subscription.html", full, (err) =>
            {
                console.log('-- Writing yt_view_subscription.html file');
                if(err) reject(err);
                else
                {
                    console.log('-- All done writing');
                    resolve();
                }
            });
        })
        .catch(err =>
        {
            reject(err);
        });
    });
}

//------------------------------------------------------------------------

function download_page(url)
{
    return new Promise((resolve, reject) =>
    {
        request(url, (err, res, body) =>
        {
            if(res && res.statusCode == 200) resolve(body);
            else                             reject(err);
        });
    })
}

function is_valid_yt_url(url)
{
    try
    {
        if
        (
            url.match(/.+www.youtube.com\/watch\?v=.+/) !== null ||
            url.match(/.+www.youtube.com\/channel\/.+/) !== null ||
            url.match(/.+www.youtube.com\/user\/.+/)    !== null ||
            url.match(/.+youtu.be\/...........+/)       !== null
        )
        {
            return true;
        }
    }
    catch(err)
    {
        console.log('Error', err);
    }

    return false;
}

function parse_channel_id(html_page)
{
    let id_string_found = html_page.search('data-channel-external-id=\"');

    if(id_string_found !== -1)
    {
        return html_page.substring(id_string_found+26, id_string_found+26+24);
    }
    else
    {
        return null;
    }
}

function parse_channel_title(channel_id)
{
    return new Promise((resolve, reject) =>
    {
        if(typeof(channel_id) != 'string' || channel_id.length != 24)
        {
            reject('Invalid youtube channel ID');
        }

        request('https://www.youtube.com/channel/'+channel_id, (err, res, body) =>
        {
            if(res && res.statusCode == 200)
            {
                try
                {
                    let id_string_found_pre = body.search('<title>  ');
                    let id_string_found_post = body.search('</title>');

                    if(
                        id_string_found_pre !== -1 &&
                        id_string_found_post !== -1 &&
                        id_string_found_pre + 11 < id_string_found_post)
                    {
                        resolve
                        (
                            body.substring
                            (
                                id_string_found_pre+9,
                                id_string_found_post-11
                            )
                        );
                    }
                    else
                    {
                        console.log('Error parsing for Title at /channel');
                    }
                }
                catch(anyError)
                {
                    reject(anyError);
                }
            }
            else
            {
                reject(err);
            }
        });
    });
}

function subscribe(url)
{
    if(is_valid_yt_url(url))
    {
        let channel_id = "";
        let channel_name_top = "";

        console.log('-- Downloading linked content');

        download_page(url)
        .then((body) =>
        {
            console.log('-- Parsing channel ID')
            return parse_channel_id(body);
        })
        .then((id) =>
        {
            channel_id = id;
            console.log('-- Parsing channel Name')
            return parse_channel_title(id);
        })
        .then((channel_name) =>
        {
            let already_subscribed = false;
            for(let i = 0; i < sub_list.length; i+=2)
            {
                if(sub_list[i] == channel_id)
                {
                    already_subscribed = true;
                    break;
                }
            }
            if(already_subscribed)
            {
                console.log(
                    `-- You were already subscribed to channel '${channel_name}'`);
            }
            else
            {
                fs.appendFile(
                    './yt_sub_list.dat', `\n${channel_id}\n${channel_name}\n`,
                    (err) =>
                {
                    if(err) console.log('Error:', err);
                    else
                    {
                        console.log(
                            `-- You are now subscribed to channel '${channel_name}'`);
                    }
                });
            }
        })
        .catch((err) =>
        {
            console.log('Error', err);
        });
    }
    else
    {
        console.log('Invalid URL');
        console.log('Requied: single youtube video/user/channel link');
    }
}