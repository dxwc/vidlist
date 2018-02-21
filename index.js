const fs        = require('fs');
const https     = require('https');

const opn       = require('opn');
const sqlite3   = require('sqlite3');
const validator = require('validator');
const Getopt    = require('node-getopt');
const xss       = require('xss-filters');

global.old_video_limit_sec = 15*24*60*60; // 15 days

function download_page(link, method)
{
    return new Promise((resolve, reject) =>
    {
        let data = '';
        https.get
        (
            link,
            (res) =>
            {
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data));
                res.on('error', (err) => reject(err));
            }
        )
        .on('error', (err) => reject(err));
    });
}

function is_valid_yt_url(url)
{
    try
    {
        if
        (
            url.match(/https:\/\/www.youtube.com\/watch\?v=.+/) !== null ||
            url.match(/https:\/\/www.youtube.com\/channel\/.+/) !== null ||
            url.match(/https:\/\/www.youtube.com\/user\/.+/)    !== null ||
            url.match(/https:\/\/youtu.be\/...........+/)       !== null
        )
        {
            return true;
        }
    }
    catch(err)
    {
        console.error('Error', err);
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
            console.error('Extracted channel id contains invalid charactes.');
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
            command,
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
        global.db = new sqlite3.Database('youtube_subscription.data', (err) =>
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
                        channel_id_id     INTEGER REFERENCES
                                          subscriptions(channel_id_id),
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

// let db = new sqlite3.Database('youtube_subscription.data'); // delete me

function subscribe(youtube_url)
{
    if(typeof(youtube_url) !== 'string' || !is_valid_yt_url(youtube_url))
        return console.error('Not a valid youtube URL');
    else if(typeof(db) === undefined)
        return console.error(`Database has not been opened`);

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
                        console.info(
                            `You were already subscribed to '${ch_name}' (${ch_id})`);
                    else
                        console.info(result);
                }
                else if(result === null)
                    console.info(`Subscribed to '${ch_name}' (${ch_id})`);
                else
                    console.error('Undefined error');
            }
        );
    })
    .catch((err) =>
    {
        console.error('Error:\n', err);
    });
}

function keep_db_shorter()
{
    return new Promise((resolve, reject) =>
    {
        db.run
        (
            `
            DELETE
                FROM videos
            WHERE
                video_published < ${
                    (new Date().getTime()/1000) - global.old_video_limit_sec}`,
            (err) =>
            {
                if(err) reject(err);
                else resolve();
            }
        );
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
                            console.info
                            (
                                String(rows[i].channel_id_id) + '.',
                                validator.unescape(rows[i].channel_name)
                            );
                    else
                        for(let i = 0; i < rows.length; ++i)
                            console.info(
                        rows[i].channel_id, validator.unescape(rows[i].channel_name));
                    resolve();
                }
            }
        );
    })

}

function insert_entries(values)
{
    return new Promise((resolve, reject) =>
    {
        if(values.length === 0) return resolve();

        db.run
        (
            `
            INSERT OR REPLACE INTO videos
            (
                channel_id_id,
                video_id,
                video_title,
                video_published,
                video_description
            )
            VALUES
            ${values}
            `,
            (result, err) =>
            {
                if
                (
                    result && typeof(result.errno) === 'number' &&
                    result.errno !== 19
                )
                {
                    return reject(result);
                }
                else
                {
                    return resolve();
                }
            }
        );
    });
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

    let values = '';

    return new Promise((resolve, reject) =>
    {
        while(page.indexOf('<entry>') !== -1)
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
            {
                reject('tagname/s under entry not found');
                break;
            }

            a_title = page.substring(v_title_pre+7, v_title_post);
            a_id = page.substring(v_id_pre+12, v_id_post);
            a_pubDate = new Date
                        (
                            page.substring(v_published_pre+11, v_published_post)
                        ).getTime()/1000;
            a_description = page.substring(v_description_pre+19, v_description_post);

            a_title = validator.escape(a_title);

            if(!validator.whitelist(
                a_id.toLowerCase(), 'abcdefghijklmnopqrstuvwxyz1234567890_-'))
            {
                return reject('Extracted id is not of the expected form');
                break;
            }

            a_description = validator.escape(a_description);

            if(page.indexOf('</entry>') == -1)
            {
                return reject('</entry> not found');
                break;
            }

            page = page.substring(page.indexOf('</entry>'));

            if(a_pubDate >= (new Date().getTime()/1000) - global.old_video_limit_sec)
            {
                values += `${values.length ? ',' : ''}
(${ch_id_id}, '${a_id}', '${a_title}', ${a_pubDate}, '${a_description}')`;
            }
        }

        return insert_entries(values)
        .then(() =>
        {
            return resolve();
        });
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
                    global.remaining = rows.length;

                    for(let i = 0; i < rows.length; ++i)
                    {
                        all_downloads = all_downloads
                        .then(() =>
                        {
                            if(global.prog)
                                process.stdout.write
(`: ${global.remaining} channel's download and processing remaining\r`);

                            return download_page
                            (
                                `https://www.youtube.com/feeds/videos.xml?channel_id=`
                                + rows[i].channel_id
                            )
                            .then((page) =>
                            {
                                return page;
                            })
                            .then((page) =>
                            {
                                return parse_and_save_data(
                                    page, rows[i].channel_id_id);
                            })
                            .then(() =>
                            {
                                global.remaining -= 1;
                            });
                        });
                    }
                    resolve(all_downloads);
                }
            }
        );
    });
}

function get_video_data()
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
                if(err) return reject(err);
                return resolve(rows);
            }
        );
    });
}

function get_channel_data()
{
    return new Promise((resolve, reject) =>
    {
        db.all
        (
            `
            SELECT
                channel_id,
                channel_name
            FROM
                subscriptions
            `,
            (err, rows) =>
            {
                if(err) return reject(err);
                return resolve(rows);
            }
        );
    });
}


function generate_html()
{
    Promise.all([get_video_data(), get_channel_data()])
    .then((result) =>
    {

        let full =
`<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <title>Subscriptions</title>
    <style type='text/css'>
        body { background-color: #B4B4B4; }
        h2 { font-size: 100%; overflow: hidden; }
        img { width: 100%; }
        a
        {
            text-decoration: none;
            color: #333;
            font-weight: bold;
        }
        .container
        {
            float: left;
            padding-left: 2%;
            padding-right: 2%;
            width: 19.77%;
            background-color: #ddd;
            padding-top: 2%;
            margin-left: 1%;
            margin-bottom: 1%;
            height: 298px;
            overflow: auto;
        }
        .channels
        {
            float: left;
            width: 96%;
            padding: 2%;
            padding-top: 1%;
        }
        ul
        {
            -moz-column-count: 4;
            -moz-column-gap: 1%;
            -webkit-column-count: 4;
            -webkit-column-gap: 1%;
            column-count: 4;
            column-gap: 1%;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
`
        for(let i = 0; i < result[0].length; ++i)
        {
            full +=
`
    <div class='container' title='${xss.inHTMLData(result[0][i].channel_name)}'>
        <a href='https://www.youtube-nocookie.com/embed/\
${xss.inHTMLData(result[0][i].video_id)}?rel=0'>
            <img src='https://img.youtube.com/vi/\
${xss.inHTMLData(result[0][i].video_id)}/mqdefault.jpg'>
        </a>
        <a href='https://www.youtube.com/watch?v=\
${xss.inHTMLData(result[0][i].video_id)}'>
            <h2 title='${xss.inHTMLData(result[0][i].video_description)}'>\
${xss.inHTMLData(result[0][i].video_title)}</h2>
        </a>
    </div>`
        }

        full +=
`
    <div class='channels'>
        <h3>Channls</h3>
        <ul>`;

        result[1].forEach((elem) =>
        {
            full +=
`
           <li><a href='https://www.youtube.com/channel/\
${xss.inHTMLData(elem.channel_id)}'>\
${xss.inHTMLData(validator.unescape(elem.channel_name))}</a></li>`;
        });

        full +=
`
        </ul>
    </div>

</body>
</html>
`;
    fs.writeFileSync('yt_view_subscriptions.html', full);
    return true;

    });
}

function remove_subscription()
{
    return list_subscriptions(true)
    .then(() =>
    {
        return new Promise((resolve, reject) =>
        {
            let rl = require('readline').createInterface
            ({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Enter the channel number you wish to remove: ', (answer) =>
            {
                let channel_number;
                if(validator.isInt(answer))
                {
                    channel_number = Number(answer);
                    resolve
                    (
                        sql_promise
                        (
                            `
                            DELETE FROM videos
                            WHERE
                                channel_id_id=${channel_number}
                            `
                        )
                        .then(() =>
                        {
                            return sql_promise
                            (
                                `
                                DELETE FROM subscriptions
                                WHERE
                                    channel_id_id=${channel_number}
                                `
                            );
                        })
                        .then(() =>
                        {
                            console.info
                            (
                                '--If it was in subscription list',
                                'it has now been successfully removed');
                        })
                    );
                }
                else reject('Invalid input, not an integer');
            });
        });
    });
}

function close_everything(code)
{
    return new Promise((resolve, reject) =>
    {
        db.close((err) =>
        {
            if(err) { console.error('=>Error:\n', err); process.exit(1) }
            else resolve();
        });
    })
    .then(() =>
    {
        process.exit(code);
    });
}

/// ----------------------------------



let getopt = new Getopt
([
  ['s', 'subscribe=ARG', 'Subscribe with a video/channel url'],
  ['u', 'update', 'Fetch new updates from channels'],
  ['g', 'generate', 'Generate yt_view_subscriptions.html'],
  ['o', 'open', 'Open generated html file in default browser'],
  ['l', 'list', 'Print a list of your subscrbed channels'],
  ['p', 'progress', 'Prints progress information for update'],
  ['r', 'remove', 'Prompts to remove a subscription'],
  ['h', 'help', 'Display this help']
])
.setHelp
(
`Usages Youtube Subscriber (js)

[[OPTIONS]]

NOTE:

1. Option to show progress can be added with any other commands
   but only effective with update
2. Options to update, generate and open can be combined.For all
   other options combining will produce unexpeted results.
3. Program is currently running from this directory:
   ${__dirname}
4. Variable 'global.old_video_limit_sec' near the top of
   'index.js' file determines the maximum age of a video
   (since published) to keep in database for use, any older
   videos are removed on update. By default the limit is set
   to 15 days.
5. Bug report goes here:
   https://github.com/dxwc/youtube_subscriber.js/issues

EXAMPLE:

Subscribe to a youtube channel:

node index.js --subscribe https://www.youtube.com/watch?v=EeNiqKNtpAA

Remove a subscription:

node index.js --remove

List your subscriptions:

node index.js --list

Pull update from channel feed, show update progress, generate HTML
and open the HTML with your default browser:

node index.js -upgo
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
    if(opt.options.progress) global.prog = true;

    if(opt.options.list)
        return list_subscriptions();
    else if(opt.options.remove)
        return remove_subscription();
    else if(opt.options.subscribe)
        return subscribe(opt.options.subscribe);
    else if(opt.options.update || opt.options.generate || opt.options.open)
    {
        if(opt.options.update)
                return download_and_save_feed()
                .then(() => keep_db_shorter());
    }
    else return true;
})
.then(() =>
{
    if
    (
        opt.options.list ||
        opt.options.subscribe ||
        opt.options.remove
    )
    {
        return close_everything(0);
    }
    else if(opt.options.update)
    {
        if(global.prog)
        process.stdout.write(`                                                 \r`);
        console.info('--Fetched updates');
    }

    if(opt.options.generate) return generate_html();
    else return true;
})
.then(() =>
{
    if(opt.options.generate) console.info('--Generated HTML');
    if(opt.options.open)
    {
        console.info('--Opening HTML with your default web browser');
        opn('yt_view_subscriptions.html')
        .catch((err) =>
        {
                console.error('=>Error opening HTML:\n', err);
                return close_everything(1);
        });
    }
    setTimeout(() => { return close_everything(0)}, 600);
})
.catch((err) =>
{
    console.error('=>There was an error in operation:\n', err);
    close_everything(1);
});