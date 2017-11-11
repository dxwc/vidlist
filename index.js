const https = require('https');
const fs = require('fs');
const assert = require('assert');

const sqlite3 = require('sqlite3');
const validator = require('validator');
const opn = require('opn');
const Getopt = require('node-getopt');

function download_page(link, method)
{
    return new Promise((resolve, reject) =>
    {
        https.get
        (
            link,
            (res) =>
            {
                let data;

                res.on('data', (chunk) =>
                {
                    data += chunk;
                });

                res.on('end', () =>
                {
                    resolve(data);
                });

                res.on('error', (err) =>
                {
                    reject(err);
                });
            }
        )
        .on('error', (err) =>
        {
            reject(err);
        });
    });
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
        let ch_id = html_page.substring(id_string_found+26, id_string_found+26+24);
        if
        (
            !validator.isWhitelisted
            (
                ch_id.toLowerCase(),
                'abcdefghijklmnopqrstuvwxyz0123456789-_'
            )
        )
        {
            console.log('Extracted channel id contains invalid charactes.');
            return null;
        }
        else
        {
            return ch_id;
        }
    }
    else
    {
        return null;
    }
}

function parse_channel_name(channel_id)
{
    return new Promise((resolve, reject) =>
    {
        if(typeof(channel_id) != 'string' || channel_id.length != 24)
        {
            reject('Invalid youtube channel ID');
        }

        download_page('https://www.youtube.com/channel/'+channel_id)
        .then((page) =>
        {
            let id_string_found_pre = page.search('<title>  ');
            let id_string_found_post = page.search('</title>');

            if(
                id_string_found_pre !== -1 &&
                id_string_found_post !== -1 &&
                id_string_found_pre + 11 < id_string_found_post)
            {
                resolve
                (
                    page.substring
                    (
                        id_string_found_pre+9,
                        id_string_found_post-11
                    )
                );
            }
            else
            {
                reject('Parseable string not found in page')
            }
        });
    });
}

function sql_promise(command)
{
    return new Promise((resolve, reject) =>
    {
        db.run
        (
            command
            ,
            (result, err) =>
            {
                if(result && result.errno) reject(result);
                else if(err) reject(err);
                else resolve();
            }
        );
    });
}

function open_db_global()
{
    return new Promise((resolve, reject) =>
    {
        global.db = new sqlite3.Database('youtube_subscriber.dat', (err) =>
        {
            if(err) reject(err);
            sql_promise
            (
                `
                CREATE TABLE IF NOT EXISTS subscriptions
                (
                    channel_id_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id    TEXT UNIQUE NOT NULL,
                    channel_name  TEXT
                );
                `
            )
            .then(() =>
            {
                return sql_promise
                (
                    `
                    CREATE TABLE IF NOT EXISTS videos
                    (
                        channel_id_id     INTEGER REFERENCES subscriptions(channel_id_id),
                        video_id          TEXT PRIMARY KEY,
                        video_title       TEXT,
                        video_published   INTEGER,
                        video_description TEXT
                    );
                    `
                );
            })
            .then(() =>
            {
                return sql_promise
                (
                    `
                    CREATE INDEX IF NOT EXISTS video_published_i
                    ON videos(video_published DESC);
                    `
                );
            })
            .then(() =>
            {
                return sql_promise
                (
                    `
                    CREATE UNIQUE INDEX IF NOT EXISTS channel_id_i
                    ON subscriptions(channel_id);
                    `
                );
            })
            .then(() =>
            {
                resolve();
            })
            .catch((err) =>
            {
                reject(err);
            })
        });
    })
}

let db = new sqlite3.Database('youtube_subscriber.dat'); // delete me

function subscribe(youtube_url)
{
    if(typeof(youtube_url) !== 'string' || !is_valid_yt_url(youtube_url))
        return console.log('Not a valid youtube URL');
    else if(typeof(db) === undefined)
        return console.log(`Database has not been opened`);

    let ch_id = undefined;
    let ch_name = undefined;

    return download_page(youtube_url)
    .then((page) =>
    {
        ch_id = parse_channel_id(page);
        return parse_channel_name(ch_id);
    })
    .then((name) =>
    {
        ch_name = validator.escape(name);
        db.run
        (
            `
            INSERT INTO subscriptions
                (channel_id, channel_name)
            VALUES
                ('${ch_id}', '${ch_name}');
            `,
            (result) =>
            {
                if(result && result.errno)
                {
                    if(result.errno == 19)
                        console.log(
                            `You were already subscribed to '${ch_name}' (${ch_id})`);
                    else
                        console.log(result);
                }
                else if(result === null)
                    console.log(`Subscribed to '${ch_name}' (${ch_id})`);
                else
                    console.log('Undefined error');
            }
        );
    })
    .catch((err) =>
    {
        console.log('Error:\n', err);
    });
}

function list_subscriptions(names_only)
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `
            SELECT * FROM subscriptions
            `,
            (err, rows) =>
            {
                if(err) reject(err);
                else
                {
                    if(names_only)
                        for(let i = 0; i < rows.length; ++i)
                            console.log(
                            validator.unescape(rows[i].channel_name));
                    else
                        for(let i = 0; i < rows.length; ++i)
                            console.log(
                        rows[i].channel_id, validator.unescape(rows[i].channel_name));
                    resolve();
                }
            }
        );
    })

}

function parse_and_save_data(page, ch_id_id)
{
    let v_id_pre = -1;
    let v_id_post = -1;
    let v_title_pre = -1;
    let v_title_post = -1;
    let v_published_pre = -1;
    let v_published_post = -1;
    let v_description_pre = -1;
    let v_description_post = -1;

    let a_id;
    let a_title;
    let a_pubDate;
    let a_description;

    return new Promise((resolve, reject) =>
    {
        while(true)
        {
            page = page.substring(page.indexOf('<entry>')-1);

            v_id_pre = page.indexOf('<yt:videoId>');
            v_id_post = page.indexOf('</yt:videoId>');
            v_title_pre = page.indexOf('<title>');
            v_title_post = page.indexOf('</title>');
            v_published_pre = page.indexOf('<published>');
            v_published_post = page.indexOf('</published>');
            v_description_pre = page.indexOf('<media:description>');
            v_description_post = page.indexOf('</media:description>');

            if
            (
                v_id_pre           === -1 ||
                v_id_post          === -1 ||
                v_title_pre        === -1 ||
                v_title_post       === -1 ||
                v_published_pre    === -1 ||
                v_published_post   === -1 ||
                v_description_pre  === -1 ||
                v_description_post === -1
            )
                reject('tagname/s under entry not found');

            a_title = page.substring(v_title_pre+7, v_title_post);
            a_id = page.substring(v_id_pre+12, v_id_post);
            a_pubDate = new Date(page.substring(v_published_pre+11, v_published_post)).getTime()/1000;
            a_description = page.substring(v_description_pre+19, v_description_post);

            a_title = validator.escape(a_title);

            if(!validator.whitelist(
                a_id.toLowerCase(), 'abcdefghijklmnopqrstuvwxyz1234567890_-'))
            {
                reject('Extracted id is not of the expected form');
                break;
            }

            a_description = validator.escape(a_description);

            if(page.indexOf('</entry>') == -1)
            { reject('</entry> not found'); break; }
            page = page.substring(page.indexOf('</entry>'));

            if(page.indexOf('<entry>') == -1)
            {
                db.run
                (
                    `
                    INSERT INTO videos
                    (
                        channel_id_id,
                        video_id,
                        video_title,
                        video_published,
                        video_description
                    )
                    VALUES
                    (
                        ${ch_id_id},
                        '${a_id}',
                        '${a_title}',
                        ${a_pubDate},
                        '${a_description}'
                    );
                    `,
                    (result, err) =>
                    {
                        if
                        (
                            result && typeof(result.errno) === 'number' &&
                            result.errno !== 19
                        )
                            reject(result);
                        else
                            resolve();
                    }
                );
                break;
            }
            else
            {
                db.run
                (
                    `
                    INSERT INTO videos
                    (
                        channel_id_id,
                        video_id,
                        video_title,
                        video_published,
                        video_description
                    )
                    VALUES
                    (
                        ${ch_id_id},
                        '${a_id}',
                        '${a_title}',
                        ${a_pubDate},
                        '${a_description}'
                    );
                    `,
                    (result, err) =>
                    {
                        if
                        (
                            result && typeof(result.errno) === 'number' &&
                            result.errno !== 19
                        )
                            reject(result);
                    }
                );
            }
        }
    });
}

function download_and_save_feed()
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `
            SELECT channel_id_id, channel_id FROM subscriptions
            `,
            (err, rows) =>
            {
                if(err) reject(err);
                else
                {
                    let all_downloads = Promise.resolve();

                    for(let i = 0; i < rows.length; ++i)
                    {
                        all_downloads = all_downloads
                        .then(() =>
                        {
                            return download_page
                            (
                                `https://www.youtube.com/feeds/videos.xml?channel_id=`
                                + rows[i].channel_id
                            )
                            .then((page) =>
                            {
                                return parse_and_save_data(
                                    page, rows[i].channel_id_id);
                            });
                        });
                    }
                    resolve(all_downloads);
                }
            }
        );
    });
}

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

function generate_html()
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `
            SELECT
                channel_id,
                channel_name,
                video_id,
                video_title,
                video_published,
                video_description
            FROM
            subscriptions
                INNER JOIN
            (SELECT * FROM videos ORDER BY video_published DESC) vi
            ON subscriptions.channel_id_id = vi.channel_id_id
            `,
            (err, rows) =>
            {
                if(err) reject(err);
                else
                {
                    full = html_pre;
                    for(let i = 0; i < rows.length; ++i)
                    {
                        full += section_a;
                        full += rows[i].video_id; // id
                        full += section_b;
                        full += section_c;
                        full += rows[i].video_id;
                        full += section_d;
                        full += rows[i].video_id;
                        full += section_e;
                        full += rows[i].video_title; // title
                        full += section_f;
                    }
                    full += html_post;
                    fs.writeFileSync('./yt_view_subscription.html', full);
                    resolve();
                }
            }
        );
    });
}

function close_everything(code)
{
    return new Promise((resolve, reject) =>
    {
        db.close((err) =>
        {
            if(err) { console.log('=>Error:\n', err); process.exit(1) }
            else resolve();
        });
    })
    .then(() =>
    {
        process.exit(code);
    });
}

/// ----------------------------------



let getopt = new Getopt([
  ['s', 'subscribe=ARG', 'Subscribe to youtube channel given a video/channel url'],
  ['u', 'update', 'Fetch feeds for subscribed channel and update video database'],
  ['g', 'generate', 'Generate yt_view_subscription.html in current directory'],
  ['o', 'open', 'Open generated html file in default browser'],
  ['l', 'list', 'Print list of your subscrbed channels'],
  ['h', 'help', 'Display this help']
])
.setHelp
(
`Usages Youtube Subscriber (js)

[[OPTIONS]]

NOTE:

Options to update, generate and open can be combined. For all other
options only the first will execute.

EXAMPLE:

#Subscribe to a youtube chanel:
node index.js --subscribe https://www.youtube.com/watch?v=EeNiqKNtpAA

#List your subscriptions:
node index.js --list

#Update feed, Generate HTML and Open the HTML in your default browser:
node index.js -ugo
`
)
.error(() =>
{
    console.info('Invalid option\n', getopt.getHelp());
    process.exit(1);
});

let opt = getopt.parse(process.argv.slice(2));
if(process.argv.length <= 2 || opt.options.help)
{
    console.info(getopt.getHelp());
    process.exit(0);
}

open_db_global()
.then(() =>
{
    if(opt.options.list)
        return list_subscriptions();
    else if(opt.options.subscribe)
        return subscribe(opt.options.subscribe);
    else if(opt.options.update || opt.options.generate || opt.options.open)
    {
        if(opt.options.update) return download_and_save_feed();
    }
    else return true;
})
.then(() =>
{
    if(opt.options.list || opt.options.subscribe) return close_everything(0);
    else if(opt.options.update) console.log('--Updated feed');

    if(opt.options.generate) return generate_html();
    else return true;
})
.then(() =>
{
    if(opt.options.generate) console.log('--Generated HTML');
    if(opt.options.open)
    {
        console.log('--Opening HTML to your default browser');
        opn('./yt_view_subscription.html')
        .catch((err) =>
        {
                console.log('=>Error opening HTML:\n', err);
                return close_everything(1);
        });
    }
    setTimeout(() => { return close_everything(0)}, 600);
})
.catch((err) =>
{
    console.log('=>There was an error in operation:\n', err);
    close_everything(1);
});